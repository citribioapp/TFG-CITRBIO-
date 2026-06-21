<?php

namespace App\OpenApi;

use OpenApi\Attributes as OA;

#[OA\OpenApi(
    security: [["Bearer" => []]]
)]
#[OA\Info(
    title: "Auth API",
    version: "1.0.0"
)]
#[OA\Server(
    url: "http://localhost:8000"
)]
#[OA\SecurityScheme(
    securityScheme: "Bearer",
    type: "http",
    scheme: "bearer",
    bearerFormat: "JWT"
)]
class OpenApi
{
}