<?php

namespace App\DTO;

use Symfony\Component\Validator\Constraints as Assert;

class ResetPasswordRequestDTO
{
    #[Assert\NotBlank(message: "El código es obligatorio.")]
    #[Assert\Length(
        min: 6,
        max: 6,
        exactMessage: "El código debe tener exactamente 6 cifras."
    )]
    #[Assert\Regex(
        pattern: "/^\d{6}$/",
        message: "El código debe contener solo números."
    )]
    public string $token;

    #[Assert\NotBlank(message: "La nueva contraseña es obligatoria.")]
    #[Assert\Length(
        min: 8,
        minMessage: "La contraseña debe tener al menos 8 caracteres."
    )]
    public string $newPassword;
}