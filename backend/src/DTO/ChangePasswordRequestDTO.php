<?php

namespace App\DTO;

use Symfony\Component\Validator\Constraints as Assert;

class ChangePasswordRequestDTO
{
    #[Assert\NotBlank(message: "La contraseña actual es obligatoria.")]
    public string $currentPassword;

    #[Assert\NotBlank(message: "La nueva contraseña es obligatoria.")]
    #[Assert\Length(
        min: 8,
        minMessage: "La nueva contraseña debe tener al menos 8 caracteres."
    )]
    public string $newPassword;
}