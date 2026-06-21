<?php

namespace App\Tests\DTO;

use App\DTO\RegisterRequestDTO;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Validator\Validation;

class RegisterRequestDTOTest extends TestCase
{
    private $validator;

    protected function setUp(): void
    {
        $this->validator = Validation::createValidatorBuilder()
            ->enableAttributeMapping()
            ->getValidator();
    }

    public function testValidRegistrationData(): void
    {
        $dto = new RegisterRequestDTO();
        $dto->name = 'Juan';
        $dto->lastName = 'García López';
        $dto->dni = '12345678A';
        $dto->email = 'juan@example.com';
        $dto->deliveryAddress = 'Calle Mayor 1, Madrid';
        $dto->phone = '+34 600 123 456';
        $dto->password = 'Password123';

        $violations = $this->validator->validate($dto);

        $this->assertCount(0, $violations, 'Valid DTO should have no violations');
    }

    public function testInvalidEmailFormat(): void
    {
        $dto = new RegisterRequestDTO();
        $dto->name = 'Juan';
        $dto->lastName = 'García';
        $dto->dni = '12345678A';
        $dto->email = 'invalid-email';
        $dto->deliveryAddress = 'Calle Mayor 1';
        $dto->phone = '+34 600 123 456';
        $dto->password = 'Password123';

        $violations = $this->validator->validate($dto);

        $this->assertGreaterThan(0, $violations->count(), 'Invalid email should produce violations');
    }

    public function testMissingRequiredFields(): void
    {
        $dto = new RegisterRequestDTO();

        $violations = $this->validator->validate($dto);

        $this->assertGreaterThan(0, $violations->count(), 'Empty DTO should have violations');
    }

    public function testPasswordTooShort(): void
    {
        $dto = new RegisterRequestDTO();
        $dto->name = 'Juan';
        $dto->lastName = 'García';
        $dto->dni = '12345678A';
        $dto->email = 'juan@example.com';
        $dto->deliveryAddress = 'Calle Mayor 1';
        $dto->phone = '+34 600 123 456';
        $dto->password = '12345'; // Too short

        $violations = $this->validator->validate($dto);

        $this->assertGreaterThan(0, $violations->count(), 'Short password should produce violations');
    }
}
