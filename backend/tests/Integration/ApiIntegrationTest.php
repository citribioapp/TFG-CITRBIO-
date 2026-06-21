<?php

declare(strict_types=1);

namespace App\Tests\Integration;

use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Tools\SchemaTool;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

/**
 * Integration tests for the main Citribio API flows.
 *
 * Environment: APP_ENV=test with SQLite (see .env.test).
 * The schema is created once before the first test and reused across all tests
 * in this class. Each test uses unique emails/DNIs to avoid conflicts.
 *
 * Run with:
 *   cd citribio-backend
 *   vendor/bin/phpunit tests/Integration/ApiIntegrationTest.php --testdox
 */
class ApiIntegrationTest extends WebTestCase
{
    /** Ensures the SQLite schema is only created once per test run. */
    private static bool $schemaCreated = false;

    /** Counter used to generate unique DNIs across tests. */
    private static int $dniCounter = 10000000;

    // ── Schema lifecycle ─────────────────────────────────────────────────────

    protected function setUp(): void
    {
        parent::setUp();

        if (!self::$schemaCreated) {
            $client = static::createClient();
            /** @var EntityManagerInterface $em */
            $em = $client->getContainer()->get('doctrine.orm.entity_manager');
            $tool = new SchemaTool($em);
            $tool->dropDatabase();
            $tool->createSchema($em->getMetadataFactory()->getAllMetadata());
            self::$schemaCreated = true;
            static::ensureKernelShutdown();
        }
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    /**
     * Generate a unique, valid DNI (8 digits + letter) for each call.
     * Pattern required by RegisterRequestDTO: /^\d{8}[A-Za-z]$/
     */
    private static function uniqueDni(): string
    {
        return str_pad((string) ++self::$dniCounter, 8, '0', STR_PAD_LEFT) . 'T';
    }

    /**
     * Create a user directly in the database using the Symfony password hasher.
     * This bypasses the HTTP layer and is reliable regardless of rate limiting
     * or other middleware. Use this for tests that only need a valid user in DB.
     *
     * @param array<string, mixed> $overrides
     */
    private function createUserFixture(
        string $email,
        string $password = 'Password123!',
        array $roles = ['ROLE_USER'],
        array $overrides = [],
    ): void {
        $client = static::createClient();
        $container = $client->getContainer();

        /** @var EntityManagerInterface $em */
        $em = $container->get('doctrine.orm.entity_manager');
        /** @var UserPasswordHasherInterface $hasher */
        $hasher = $container->get(UserPasswordHasherInterface::class);

        $user = new User();
        $user->setName($overrides['name'] ?? 'Test');
        $user->setLastName($overrides['lastName'] ?? 'User');
        $user->setDni($overrides['dni'] ?? self::uniqueDni());
        $user->setEmail($email);
        $user->setRoles($roles);
        $user->setPassword($hasher->hashPassword($user, $password));
        $user->setDeliveryAddress($overrides['deliveryAddress'] ?? 'Calle Test 1, Madrid');
        $user->setPhone($overrides['phone'] ?? '+34 600 000 001');

        $em->persist($user);
        $em->flush();

        static::ensureKernelShutdown();
    }

    /**
     * Register a user via the real HTTP endpoint and return the status code.
     * Uses a valid DNI format: 8 digits + 1 letter.
     *
     * @param array<string, mixed> $overrides
     */
    private function registerUser(string $email, array $overrides = []): int
    {
        $client = static::createClient();
        $client->request(
            'POST',
            '/api/register',
            [],
            [],
            ['CONTENT_TYPE' => 'application/json'],
            json_encode(array_merge([
                'name'            => 'Test',
                'lastName'        => 'User',
                'dni'             => self::uniqueDni(),
                'email'           => $email,
                'deliveryAddress' => 'Calle Test 1, Madrid',
                'phone'           => '+34 600 000 001',
                'password'        => 'Password123!',
            ], $overrides), JSON_THROW_ON_ERROR),
        );

        $status = $client->getResponse()->getStatusCode();
        static::ensureKernelShutdown();

        return $status;
    }

    /**
     * GET with optional Authorization header — returns the full Response.
     */
    private function getJson(string $uri, ?string $token = null): Response
    {
        $client = static::createClient();
        $headers = ['CONTENT_TYPE' => 'application/json'];

        if ($token !== null) {
            $headers['HTTP_AUTHORIZATION'] = 'Bearer ' . $token;
        }

        $client->request('GET', $uri, [], [], $headers);
        $response = $client->getResponse();
        static::ensureKernelShutdown();

        return $response;
    }

    /**
     * Login via the real HTTP endpoint and return the JWT token, or null on failure.
     */
    private function loginAndGetToken(string $email, string $password = 'Password123!'): ?string
    {
        $client = static::createClient();
        $client->request(
            'POST',
            '/api/login',
            [],
            [],
            ['CONTENT_TYPE' => 'application/json'],
            json_encode(['email' => $email, 'password' => $password], JSON_THROW_ON_ERROR),
        );

        $data = json_decode($client->getResponse()->getContent() ?: '{}', true) ?? [];
        static::ensureKernelShutdown();

        return $data['token'] ?? null;
    }

    // ── 1. Register endpoint validation ──────────────────────────────────────

    public function testRegisterWithMissingFieldsReturns400(): void
    {
        $client = static::createClient();
        $client->request(
            'POST',
            '/api/register',
            [],
            [],
            ['CONTENT_TYPE' => 'application/json'],
            json_encode(['email' => 'incomplete@example.com'], JSON_THROW_ON_ERROR),
        );

        $this->assertSame(
            Response::HTTP_BAD_REQUEST,
            $client->getResponse()->getStatusCode(),
            'Missing required fields should return 400',
        );
    }

    public function testRegisterWithInvalidEmailReturns400(): void
    {
        $client = static::createClient();
        $client->request(
            'POST',
            '/api/register',
            [],
            [],
            ['CONTENT_TYPE' => 'application/json'],
            json_encode([
                'name'            => 'Test',
                'lastName'        => 'User',
                'dni'             => self::uniqueDni(),
                'email'           => 'not-an-email',
                'deliveryAddress' => 'Calle Test 1',
                'phone'           => '+34 600 000 001',
                'password'        => 'Password123!',
            ], JSON_THROW_ON_ERROR),
        );

        $this->assertSame(
            Response::HTTP_BAD_REQUEST,
            $client->getResponse()->getStatusCode(),
            'Invalid email format should return 400',
        );
    }

    public function testRegisterWithValidPayloadReturns201(): void
    {
        $status = $this->registerUser('register_valid@test.example');

        $this->assertSame(
            Response::HTTP_CREATED,
            $status,
            'Valid registration should return 201',
        );
    }

    public function testRegisterWithDuplicateEmailReturns409(): void
    {
        $email = 'duplicate@test.example';

        // First registration must succeed
        $firstStatus = $this->registerUser($email);
        $this->assertSame(Response::HTTP_CREATED, $firstStatus, 'First registration should succeed');

        // Second registration with same email must conflict
        $client = static::createClient();
        $client->request(
            'POST',
            '/api/register',
            [],
            [],
            ['CONTENT_TYPE' => 'application/json'],
            json_encode([
                'name'            => 'Other',
                'lastName'        => 'User',
                'dni'             => self::uniqueDni(),
                'email'           => $email,
                'deliveryAddress' => 'Calle Test 2',
                'phone'           => '+34 600 222 222',
                'password'        => 'Password123!',
            ], JSON_THROW_ON_ERROR),
        );

        $this->assertSame(
            Response::HTTP_CONFLICT,
            $client->getResponse()->getStatusCode(),
            'Duplicate email should return 409',
        );
    }

    // ── 2. Login flow ─────────────────────────────────────────────────────────

    public function testLoginWithValidCredentialsReturnsToken(): void
    {
        $email = 'login_valid@test.example';

        // Create user directly in DB with a known hashed password
        $this->createUserFixture($email);

        $client = static::createClient();
        $client->request(
            'POST',
            '/api/login',
            [],
            [],
            ['CONTENT_TYPE' => 'application/json'],
            json_encode(['email' => $email, 'password' => 'Password123!'], JSON_THROW_ON_ERROR),
        );

        $this->assertSame(
            Response::HTTP_OK,
            $client->getResponse()->getStatusCode(),
            'Valid login should return 200',
        );

        $body = json_decode($client->getResponse()->getContent() ?: '{}', true) ?? [];
        $this->assertArrayHasKey('token', $body, 'Response must contain a JWT token');
        $this->assertNotEmpty($body['token']);
    }

    public function testLoginWithInvalidPasswordReturns401(): void
    {
        $email = 'login_bad_pass@test.example';
        $this->createUserFixture($email);

        $client = static::createClient();
        $client->request(
            'POST',
            '/api/login',
            [],
            [],
            ['CONTENT_TYPE' => 'application/json'],
            json_encode(['email' => $email, 'password' => 'WrongPassword!'], JSON_THROW_ON_ERROR),
        );

        $this->assertSame(
            Response::HTTP_UNAUTHORIZED,
            $client->getResponse()->getStatusCode(),
            'Wrong password should return 401',
        );
    }

    public function testLoginWithUnknownEmailReturns401(): void
    {
        $client = static::createClient();
        $client->request(
            'POST',
            '/api/login',
            [],
            [],
            ['CONTENT_TYPE' => 'application/json'],
            json_encode(['email' => 'nobody@test.example', 'password' => 'Password123!'], JSON_THROW_ON_ERROR),
        );

        $this->assertSame(
            Response::HTTP_UNAUTHORIZED,
            $client->getResponse()->getStatusCode(),
            'Unknown email should return 401',
        );
    }

    // ── 3. Public catalog endpoints ───────────────────────────────────────────

    public function testGetCategoriesReturnsJsonArray(): void
    {
        $response = $this->getJson('/api/categories');

        $this->assertSame(Response::HTTP_OK, $response->getStatusCode());
        $this->assertStringContainsString('application/json', $response->headers->get('Content-Type') ?? '');

        $body = json_decode($response->getContent() ?: '[]', true);
        $this->assertIsArray($body, 'GET /api/categories must return a JSON array');
    }

    public function testGetProductsReturnsJsonArray(): void
    {
        $response = $this->getJson('/api/products');

        $this->assertSame(Response::HTTP_OK, $response->getStatusCode());
        $this->assertStringContainsString('application/json', $response->headers->get('Content-Type') ?? '');

        $body = json_decode($response->getContent() ?: '[]', true);
        $this->assertIsArray($body, 'GET /api/products must return a JSON array');
    }

    public function testGetProductsWithSearchParamReturnsJsonArray(): void
    {
        $response = $this->getJson('/api/products?search=naranja');

        $this->assertSame(Response::HTTP_OK, $response->getStatusCode());

        $body = json_decode($response->getContent() ?: '[]', true);
        $this->assertIsArray($body, 'GET /api/products?search=... must return a JSON array');
    }

    public function testGetProductsWithCategoryParamReturnsJsonArray(): void
    {
        $response = $this->getJson('/api/products?category=1');

        $this->assertSame(Response::HTTP_OK, $response->getStatusCode());

        $body = json_decode($response->getContent() ?: '[]', true);
        $this->assertIsArray($body, 'GET /api/products?category=... must return a JSON array');
    }

    // ── 4. Protected endpoints ────────────────────────────────────────────────

    public function testGetMeWithoutTokenReturns401(): void
    {
        $response = $this->getJson('/api/me');

        $this->assertSame(
            Response::HTTP_UNAUTHORIZED,
            $response->getStatusCode(),
            'GET /api/me without token must return 401',
        );
    }

    public function testGetMeWithValidTokenReturns200(): void
    {
        $email = 'me_endpoint@test.example';
        $this->createUserFixture($email);

        $token = $this->loginAndGetToken($email);
        $this->assertNotNull($token, 'Login must return a token');

        $response = $this->getJson('/api/me', $token);

        $this->assertSame(
            Response::HTTP_OK,
            $response->getStatusCode(),
            'GET /api/me with valid token must return 200',
        );

        $body = json_decode($response->getContent() ?: '{}', true) ?? [];
        $this->assertSame($email, $body['email'] ?? null);
    }

    public function testAdminEndpointWithoutTokenReturns401(): void
    {
        $response = $this->getJson('/api/users');

        $this->assertSame(
            Response::HTTP_UNAUTHORIZED,
            $response->getStatusCode(),
            'Admin endpoint without token must return 401',
        );
    }

    public function testAdminEndpointWithNonAdminTokenReturns403(): void
    {
        $email = 'non_admin_403@test.example';
        // Explicitly create with ROLE_USER only — self-contained, no order dependency
        $this->createUserFixture($email, 'Password123!', ['ROLE_USER']);

        $token = $this->loginAndGetToken($email);
        $this->assertNotNull($token, 'Login must return a token for ROLE_USER');

        $client = static::createClient();
        $client->request(
            'GET',
            '/api/users',
            [],
            [],
            [
                'CONTENT_TYPE'       => 'application/json',
                'HTTP_AUTHORIZATION' => 'Bearer ' . $token,
            ],
        );

        $this->assertSame(
            Response::HTTP_FORBIDDEN,
            $client->getResponse()->getStatusCode(),
            'Admin endpoint with ROLE_USER token must return 403',
        );
    }

    public function testAdminMetricsWithAdminTokenReturns200(): void
    {
        $adminEmail = 'admin_metrics@test.example';
        // Explicitly create with ROLE_ADMIN — self-contained, no order dependency
        $this->createUserFixture($adminEmail, 'Password123!', ['ROLE_ADMIN']);

        $token = $this->loginAndGetToken($adminEmail);
        $this->assertNotNull($token, 'Admin login must return a token');

        $client = static::createClient();
        $client->request(
            'GET',
            '/api/admin/metrics',
            [],
            [],
            [
                'CONTENT_TYPE'       => 'application/json',
                'HTTP_AUTHORIZATION' => 'Bearer ' . $token,
            ],
        );

        $this->assertSame(
            Response::HTTP_OK,
            $client->getResponse()->getStatusCode(),
            'Admin metrics with ROLE_ADMIN token must return 200',
        );

        $body = json_decode($client->getResponse()->getContent() ?: '{}', true) ?? [];
        $this->assertArrayHasKey('totalUsers', $body);
        $this->assertArrayHasKey('totalOrders', $body);
    }
}
