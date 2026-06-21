<?php

namespace App\DTO;

use Symfony\Component\Validator\Constraints as Assert;

class DeleteAccountRequestDTO
{
    #[Assert\NotBlank(message: "La contraseña es obligatoria.")]
    public string $password;
}