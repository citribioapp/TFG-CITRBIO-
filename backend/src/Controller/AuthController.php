<?php

namespace App\Controller;

use OpenApi\Attributes as OA;
use App\DTO\RegisterRequestDTO;
use App\DTO\ForgotPasswordRequestDTO;
use App\DTO\ResetPasswordRequestDTO;
use App\DTO\ChangePasswordRequestDTO;
use App\DTO\DeleteAccountRequestDTO;
use App\Entity\User;
use App\Service\ResendMailer;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Core\Security;
use Symfony\Component\Serializer\SerializerInterface;
use Symfony\Component\Validator\Validator\ValidatorInterface;
use Symfony\Component\RateLimiter\RateLimiterFactory;
use Psr\Log\LoggerInterface;

class AuthController extends AbstractController
{
    public function __construct(
        private readonly string $mailerFrom,
        private readonly LoggerInterface $logger,
    ) {
    }

    #[OA\Post(
        path: "/api/register",
        summary: "Registrar nuevo usuario",
        tags: ["Auth"],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ["name", "lastName", "dni", "email", "deliveryAddress", "phone", "password"],
                properties: [
                    new OA\Property(property: "name", type: "string", example: "Sara"),
                    new OA\Property(property: "lastName", type: "string", example: "Garcia Lopez"),
                    new OA\Property(property: "dni", type: "string", example: "12345678A"),
                    new OA\Property(property: "email", type: "string", example: "usuario@email.com"),
                    new OA\Property(
                        property: "deliveryAddress",
                        type: "string",
                        example: "Calle Mayor 12, 3B, 28013 Madrid"
                    ),
                    new OA\Property(property: "phone", type: "string", example: "+34 600 123 123"),
                    new OA\Property(property: "password", type: "string", example: "Password123")
                ]
            )
        ),
        responses: [
            new OA\Response(response: 201, description: "Usuario registrado correctamente"),
            new OA\Response(response: 400, description: "Error de validación"),
            new OA\Response(response: 409, description: "Email o DNI ya registrados")
        ]
    )]
    #[Route('/api/register', name: 'api_register', methods: ['POST'])]
    public function register(
        Request $request,
        EntityManagerInterface $em,
        UserPasswordHasherInterface $passwordHasher,
        SerializerInterface $serializer,
        ValidatorInterface $validator
    ): JsonResponse {
        $dto = $serializer->deserialize(
            $request->getContent(),
            RegisterRequestDTO::class,
            'json'
        );

        $validationResponse = $this->validateDTO($dto, $validator);
        if ($validationResponse) {
            return $validationResponse;
        }

        $userRepository = $em->getRepository(User::class);

        $existingUserByEmail = $userRepository->findOneBy([
            'email' => $dto->email
        ]);

        if ($existingUserByEmail) {
            return new JsonResponse([
                'error' => 'Ya existe un usuario con ese email.'
            ], 409);
        }

        $existingUserByDni = $userRepository->findOneBy([
            'dni' => strtoupper($dto->dni)
        ]);

        if ($existingUserByDni) {
            return new JsonResponse([
                'error' => 'Ya existe un usuario con ese DNI.'
            ], 409);
        }

        $user = new User();
        $user->setName($dto->name);
        $user->setLastName($dto->lastName);
        $user->setDni(strtoupper($dto->dni));
        $user->setEmail($dto->email);
        $user->setDeliveryAddress($dto->deliveryAddress);
        $user->setPhone($dto->phone);
        $user->setPassword(
            $passwordHasher->hashPassword($user, $dto->password)
        );
        $totalUsers = $em->getRepository(User::class)->count([]);

        if ($totalUsers === 0) {
            $user->setRoles(['ROLE_ADMIN']);
        } else {
            $user->setRoles(['ROLE_USER']);
        }

        $em->persist($user);
        $em->flush();

        return new JsonResponse([
            'message' => 'Usuario registrado correctamente.'
        ], 201);
    }

    #[OA\Post(
        path: "/api/login",
        summary: "Iniciar sesión",
        tags: ["Auth"],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                type: "object",
                required: ["email", "password"],
                properties: [
                    new OA\Property(property: "email", type: "string", example: "usuario@email.com"),
                    new OA\Property(property: "password", type: "string", example: "Password123")
                ]
            )
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: "JWT Token generado",
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: "token", type: "string")
                    ]
                )
            ),
            new OA\Response(response: 401, description: "Credenciales inválidas")
        ]
    )]
    #[Route('/api/login', name: 'api_login_doc', methods: ['POST'])]
    public function loginDoc(): JsonResponse
    {
        return new JsonResponse();
    }

    #[Route('/api/login', name: 'api_login', methods: ['POST'])]
    public function login(): void
    {
        throw new \Exception('This method should not be reached.');
    }

    #[OA\Get(
        path: "/api/me",
        summary: "Obtener usuario autenticado",
        tags: ["Auth"],
        security: [["Bearer" => []]],
        responses: [
            new OA\Response(response: 200, description: "Datos del usuario"),
            new OA\Response(response: 401, description: "No autorizado")
        ]
    )]
    #[Route('/api/me', name: 'api_me', methods: ['GET'])]
    public function me(Security $security): JsonResponse
    {
        $user = $security->getUser();

        if (!$user instanceof User) {
            return new JsonResponse(['error' => 'Unauthorized'], 401);
        }

        return new JsonResponse([
            'id' => $user->getId(),
            'name' => $user->getName(),
            'lastName' => $user->getLastName(),
            'dni' => $user->getDni(),
            'email' => $user->getEmail(),
            'phone' => $user->getPhone(),
            'deliveryAddress' => $user->getDeliveryAddress(),
            'roles' => $user->getRoles(),
        ]);
    }

    #[OA\Patch(
        path: "/api/me",
        summary: "Actualizar perfil del usuario autenticado",
        tags: ["Auth"],
        security: [["Bearer" => []]],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: "name", type: "string", example: "Sara"),
                    new OA\Property(property: "lastName", type: "string", example: "Garcia Lopez"),
                    new OA\Property(
                        property: "deliveryAddress",
                        type: "string",
                        example: "Calle Mayor 12, 3B, 28013 Madrid"
                    ),
                    new OA\Property(property: "phone", type: "string", example: "+34 600 123 123")
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: "Perfil actualizado correctamente"),
            new OA\Response(response: 400, description: "Datos inválidos"),
            new OA\Response(response: 401, description: "No autorizado")
        ]
    )]
    #[Route('/api/me', name: 'api_me_update', methods: ['PATCH'])]
    public function updateMe(
        Request $request,
        Security $security,
        EntityManagerInterface $em
    ): JsonResponse {
        $user = $security->getUser();

        if (!$user instanceof User) {
            return new JsonResponse(['error' => 'Unauthorized'], 401);
        }

        $data = json_decode($request->getContent(), true);

        if (!is_array($data)) {
            return new JsonResponse([
                'error' => 'JSON inválido.'
            ], 400);
        }

        if (array_key_exists('name', $data)) {
            $name = trim((string) $data['name']);

            if ($name === '') {
                return new JsonResponse([
                    'error' => 'El nombre no puede estar vacío.'
                ], 400);
            }

            if (mb_strlen($name) > 100) {
                return new JsonResponse([
                    'error' => 'El nombre no puede superar los 100 caracteres.'
                ], 400);
            }

            $user->setName($name);
        }

        if (array_key_exists('lastName', $data)) {
            $lastName = trim((string) $data['lastName']);

            if ($lastName === '') {
                return new JsonResponse([
                    'error' => 'Los apellidos no pueden estar vacíos.'
                ], 400);
            }

            if (mb_strlen($lastName) > 150) {
                return new JsonResponse([
                    'error' => 'Los apellidos no pueden superar los 150 caracteres.'
                ], 400);
            }

            $user->setLastName($lastName);
        }

        if (array_key_exists('deliveryAddress', $data)) {
            $deliveryAddress = trim((string) $data['deliveryAddress']);

            if ($deliveryAddress === '') {
                return new JsonResponse([
                    'error' => 'La dirección de entrega es obligatoria.'
                ], 400);
            }

            if (mb_strlen($deliveryAddress) > 255) {
                return new JsonResponse([
                    'error' => 'La dirección de entrega no puede superar los 255 caracteres.'
                ], 400);
            }

            $user->setDeliveryAddress($deliveryAddress);
        }

        if (array_key_exists('phone', $data)) {
            $phone = trim((string) $data['phone']);

            if ($phone === '') {
                return new JsonResponse([
                    'error' => 'El teléfono es obligatorio.'
                ], 400);
            }

            if (mb_strlen($phone) > 30) {
                return new JsonResponse([
                    'error' => 'El teléfono no puede superar los 30 caracteres.'
                ], 400);
            }

            $user->setPhone($phone);
        }

        $em->flush();

        return new JsonResponse([
            'message' => 'Perfil actualizado correctamente.',
            'user' => [
                'id' => $user->getId(),
                'name' => $user->getName(),
                'lastName' => $user->getLastName(),
                'dni' => $user->getDni(),
                'email' => $user->getEmail(),
                'phone' => $user->getPhone(),
                'deliveryAddress' => $user->getDeliveryAddress(),
                'roles' => $user->getRoles(),
            ],
        ]);
    }

    #[OA\Patch(
        path: "/api/me/delivery-address",
        summary: "Actualizar dirección de entrega del usuario autenticado",
        tags: ["Auth"],
        security: [["Bearer" => []]],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ["deliveryAddress"],
                properties: [
                    new OA\Property(
                        property: "deliveryAddress",
                        type: "string",
                        example: "Calle Mayor 12, 3B, 28013 Madrid"
                    )
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: "Dirección actualizada correctamente"),
            new OA\Response(response: 400, description: "Dirección inválida"),
            new OA\Response(response: 401, description: "No autorizado")
        ]
    )]
    #[Route('/api/me/delivery-address', name: 'api_me_delivery_address_update', methods: ['PATCH'])]
    public function updateDeliveryAddress(
        Request $request,
        Security $security,
        EntityManagerInterface $em
    ): JsonResponse {
        $user = $security->getUser();

        if (!$user instanceof User) {
            return new JsonResponse(['error' => 'Unauthorized'], 401);
        }

        $data = json_decode($request->getContent(), true);

        if (!is_array($data)) {
            return new JsonResponse([
                'error' => 'JSON inválido.'
            ], 400);
        }

        $deliveryAddress = isset($data['deliveryAddress'])
            ? trim((string) $data['deliveryAddress'])
            : '';

        if ($deliveryAddress === '') {
            return new JsonResponse([
                'error' => 'La dirección de entrega es obligatoria.'
            ], 400);
        }

        if (mb_strlen($deliveryAddress) > 255) {
            return new JsonResponse([
                'error' => 'La dirección de entrega no puede superar los 255 caracteres.'
            ], 400);
        }

        $user->setDeliveryAddress($deliveryAddress);
        $em->flush();

        return new JsonResponse([
            'message' => 'Dirección de entrega actualizada correctamente.',
            'deliveryAddress' => $user->getDeliveryAddress(),
        ]);
    }

    #[OA\Post(
        path: "/api/forgot-password",
        summary: "Solicitar código de recuperación",
        tags: ["Auth"],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ["email"],
                properties: [
                    new OA\Property(property: "email", type: "string", example: "usuario@email.com")
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: "Código enviado si el email existe"),
            new OA\Response(response: 429, description: "Demasiados intentos")
        ]
    )]
    #[Route('/api/forgot-password', name: 'api_forgot_password', methods: ['POST'])]
    public function forgotPassword(
        Request $request,
        EntityManagerInterface $em,
        ResendMailer $transactionalMailer,
        SerializerInterface $serializer,
        ValidatorInterface $validator,
        RateLimiterFactory $forgotPasswordLimiter
    ): JsonResponse {
        $limiter = $forgotPasswordLimiter->create($request->getClientIp());
        $limit = $limiter->consume();

        if (!$limit->isAccepted()) {
            return new JsonResponse([
                'error' => 'Demasiados intentos. Inténtalo más tarde.'
            ], 429);
        }

        $dto = $serializer->deserialize(
            $request->getContent(),
            ForgotPasswordRequestDTO::class,
            'json'
        );

        $validationResponse = $this->validateDTO($dto, $validator);
        if ($validationResponse) {
            return $validationResponse;
        }

        $user = $em->getRepository(User::class)
            ->findOneBy(['email' => $dto->email]);

        if (!$user) {
            return new JsonResponse([
                'message' => 'Si el email existe, se ha enviado un código.'
            ]);
        }

        $token = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $hashedToken = hash('sha256', $token);

        $user->setResetToken($hashedToken);
        $user->setResetTokenExpiresAt(new \DateTimeImmutable('+10 minutes'));

        $em->flush();

        try {
            $textBody =
                "Tu código de recuperación es:\n\n" .
                $token . "\n\n" .
                "Este código expirará en 10 minutos.\n\n" .
                "Si no solicitaste este cambio, ignora este mensaje.";

            $htmlBody =
                "<div style='font-family: Arial, sans-serif; background:#f4f6f8; padding:40px 0;'>
                <div style='max-width:600px; margin:auto; background:#ffffff; border-radius:8px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.05);'>

                    <div style='background:#0f172a; color:white; padding:20px; text-align:center;'>
                    <h1 style='margin:0; font-size:22px;'>Citribio</h1>
                    <p style='margin:5px 0 0; font-size:14px;'>Recuperación de contraseña</p>
                    </div>

                    <div style='padding:30px; text-align:center;'>
                    <p style='font-size:16px; color:#333; margin-bottom:20px;'>
                        Hemos recibido una solicitud para restablecer tu contraseña.
                    </p>

                    <p style='font-size:14px; color:#666;'>
                        Usa el siguiente código de verificación:
                    </p>

                    <div style='margin:25px 0;'>
                        <span style='display:inline-block; background:#f1f5f9; padding:15px 25px; font-size:28px; letter-spacing:6px; font-weight:bold; color:#0f172a; border-radius:6px;'>
                        {$token}
                        </span>
                    </div>

                    <p style='font-size:14px; color:#666;'>
                        Este código expirará en <strong>10 minutos</strong>.
                    </p>

                    <p style='font-size:12px; color:#999; margin-top:30px;'>
                        Si no solicitaste este cambio, puedes ignorar este mensaje.
                    </p>
                    </div>

                    <div style='background:#f1f5f9; padding:15px; text-align:center; font-size:12px; color:#888;'>
                    © ".date('Y')." Citribio · Todos los derechos reservados
                    </div>

                </div>
                </div>";

            $transactionalMailer->send(
                [$user->getEmail()],
                'Código de recuperación',
                $htmlBody,
                $textBody,
            );
        } catch (\Throwable $e) {
            $this->logger->error('No se pudo enviar el email de recuperación.', [
                'recipientEmail' => $user->getEmail(),
                'error' => $e->getMessage(),
            ]);

            return new JsonResponse([
                'error' => 'No se pudo enviar el email de recuperación.'
            ], 500);
        }

        return new JsonResponse([
            'message' => 'Si el email existe, se ha enviado un código.'
        ]);
    }

    #[OA\Post(
        path: "/api/reset-password",
        summary: "Restablecer contraseña con código OTP",
        tags: ["Auth"],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ["token", "newPassword"],
                properties: [
                    new OA\Property(property: "token", type: "string", example: "123456"),
                    new OA\Property(property: "newPassword", type: "string", example: "NuevaPassword123")
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: "Contraseña actualizada correctamente"),
            new OA\Response(response: 400, description: "Código inválido o expirado")
        ]
    )]
    #[Route('/api/reset-password', name: 'api_reset_password', methods: ['POST'])]
    public function resetPassword(
        Request $request,
        EntityManagerInterface $em,
        UserPasswordHasherInterface $passwordHasher,
        SerializerInterface $serializer,
        ValidatorInterface $validator,
        RateLimiterFactory $resetPasswordLimiter
    ): JsonResponse {
        $limiter = $resetPasswordLimiter->create($request->getClientIp());
        $limit = $limiter->consume();

        if (!$limit->isAccepted()) {
            return new JsonResponse([
                'error' => 'Demasiados intentos. Inténtalo más tarde.'
            ], 429);
        }

        $dto = $serializer->deserialize(
            $request->getContent(),
            ResetPasswordRequestDTO::class,
            'json'
        );

        $validationResponse = $this->validateDTO($dto, $validator);
        if ($validationResponse) {
            return $validationResponse;
        }

        $hashedToken = hash('sha256', $dto->token);

        $user = $em->getRepository(User::class)
            ->findOneBy(['resetToken' => $hashedToken]);

        if (
            !$user ||
            !$user->getResetTokenExpiresAt() ||
            $user->getResetTokenExpiresAt() < new \DateTimeImmutable()
        ) {
            return new JsonResponse([
                'error' => 'Código inválido o expirado.'
            ], 400);
        }

        $user->setPassword(
            $passwordHasher->hashPassword($user, $dto->newPassword)
        );

        $user->setResetToken(null);
        $user->setResetTokenExpiresAt(null);

        $em->flush();

        return new JsonResponse([
            'message' => 'Contraseña actualizada correctamente.'
        ]);
    }

    #[OA\Post(
        path: "/api/change-password",
        summary: "Cambiar contraseña del usuario autenticado",
        tags: ["Auth"],
        security: [["Bearer" => []]],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ["currentPassword", "newPassword"],
                properties: [
                    new OA\Property(property: "currentPassword", type: "string", example: "PasswordActual123"),
                    new OA\Property(property: "newPassword", type: "string", example: "NuevaPassword123")
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: "Contraseña cambiada correctamente"),
            new OA\Response(response: 400, description: "Contraseña actual incorrecta"),
            new OA\Response(response: 401, description: "No autorizado")
        ]
    )]
    #[Route('/api/change-password', name: 'api_change_password', methods: ['POST'])]
    public function changePassword(
        Request $request,
        Security $security,
        UserPasswordHasherInterface $passwordHasher,
        EntityManagerInterface $em,
        SerializerInterface $serializer,
        ValidatorInterface $validator
    ): JsonResponse {
        $user = $security->getUser();

        if (!$user instanceof User) {
            return new JsonResponse(['error' => 'Unauthorized'], 401);
        }

        $dto = $serializer->deserialize(
            $request->getContent(),
            ChangePasswordRequestDTO::class,
            'json'
        );

        $validationResponse = $this->validateDTO($dto, $validator);
        if ($validationResponse) {
            return $validationResponse;
        }

        if (!$passwordHasher->isPasswordValid($user, $dto->currentPassword)) {
            return new JsonResponse([
                'error' => 'La contraseña actual es incorrecta.'
            ], 400);
        }

        $user->setPassword(
            $passwordHasher->hashPassword($user, $dto->newPassword)
        );

        $em->flush();

        return new JsonResponse([
            'message' => 'Contraseña cambiada correctamente.'
        ]);
    }

    #[OA\Delete(
        path: "/api/delete-account",
        summary: "Eliminar cuenta del usuario autenticado",
        tags: ["Auth"],
        security: [["Bearer" => []]],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ["password"],
                properties: [
                    new OA\Property(property: "password", type: "string", example: "PasswordActual123")
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: "Cuenta eliminada correctamente"),
            new OA\Response(response: 400, description: "Contraseña incorrecta"),
            new OA\Response(response: 401, description: "No autorizado")
        ]
    )]
    #[Route('/api/delete-account', name: 'api_delete_account', methods: ['DELETE'])]
    public function deleteAccount(
        Request $request,
        Security $security,
        UserPasswordHasherInterface $passwordHasher,
        EntityManagerInterface $em,
        SerializerInterface $serializer,
        ValidatorInterface $validator
    ): JsonResponse {
        $user = $security->getUser();

        if (!$user instanceof User) {
            return new JsonResponse(['error' => 'Unauthorized'], 401);
        }

        $dto = $serializer->deserialize(
            $request->getContent(),
            DeleteAccountRequestDTO::class,
            'json'
        );

        $validationResponse = $this->validateDTO($dto, $validator);
        if ($validationResponse) {
            return $validationResponse;
        }

        if (!$passwordHasher->isPasswordValid($user, $dto->password)) {
            return new JsonResponse([
                'error' => 'La contraseña es incorrecta.'
            ], 400);
        }

        $em->remove($user);
        $em->flush();

        return new JsonResponse([
            'message' => 'Cuenta eliminada correctamente.'
        ]);
    }

    private function validateDTO(object $dto, ValidatorInterface $validator): ?JsonResponse
    {
        $errors = $validator->validate($dto);

        if (count($errors) > 0) {
            $errorMessages = [];

            foreach ($errors as $error) {
                $errorMessages[] = $error->getMessage();
            }

            return new JsonResponse([
                'errors' => $errorMessages
            ], 400);
        }

        return null;
    }
}
