<?php

namespace App\DTO;

use Symfony\Component\Validator\Constraints as Assert;

class ForgotPasswordRequestDTO
{
    #[Assert\NotBlank(message: "El email es obligatorio.")]
    #[Assert\Email(message: "El formato del email no es válido.")]
    public string $email;
}