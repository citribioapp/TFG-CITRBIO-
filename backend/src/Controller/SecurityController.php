<?php

namespace App\Controller;

use Symfony\Component\Routing\Annotation\Route;

class SecurityController
{
    #[Route('/api/login', name: 'api_login', methods: ['POST'])]
    public function login(): void
    {
        // Este método nunca se ejecuta.
        // El firewall intercepta la request antes.
        throw new \Exception('This should never be reached.');
    }
}