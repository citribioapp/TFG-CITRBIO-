<?php

namespace App\DTO;

use Symfony\Component\Validator\Constraints as Assert;

class RegisterRequestDTO
{
    #[Assert\NotBlank(message: 'El nombre es obligatorio.')]
    #[Assert\Length(
        max: 100,
        maxMessage: 'El nombre no puede tener más de 100 caracteres.'
    )]
    public ?string $name = null;

    #[Assert\NotBlank(message: 'Los apellidos son obligatorios.')]
    #[Assert\Length(
        max: 150,
        maxMessage: 'Los apellidos no pueden tener más de 150 caracteres.'
    )]
    public ?string $lastName = null;

    #[Assert\NotBlank(message: 'El DNI es obligatorio.')]
    #[Assert\Regex(
        pattern: '/^\d{8}[A-Za-z]$/',
        message: 'El DNI debe tener 8 números y una letra.'
    )]
    public ?string $dni = null;

    #[Assert\NotBlank(message: 'El email es obligatorio.')]
    #[Assert\Email(message: 'El email no es válido.')]
    public ?string $email = null;

    #[Assert\NotBlank(message: 'La dirección de entrega es obligatoria.')]
    #[Assert\Length(
        max: 255,
        maxMessage: 'La dirección de entrega no puede tener más de 255 caracteres.'
    )]
    public ?string $deliveryAddress = null;

    #[Assert\NotBlank(message: 'El teléfono es obligatorio.')]
    #[Assert\Length(
        max: 30,
        maxMessage: 'El teléfono no puede tener más de 30 caracteres.'
    )]
    public ?string $phone = null;

    #[Assert\NotBlank(message: 'La contraseña es obligatoria.')]
    #[Assert\Length(
        min: 6,
        minMessage: 'La contraseña debe tener al menos 6 caracteres.'
    )]
    public ?string $password = null;
}
