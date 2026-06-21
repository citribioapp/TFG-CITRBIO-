<?php

namespace App\Controller;

use App\Service\ResendMailer;
use OpenApi\Attributes as OA;
use Psr\Log\LoggerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Validator\Constraints as Assert;
use Symfony\Component\Validator\Validator\ValidatorInterface;

class ContactController extends AbstractController
{
    public function __construct(
        private readonly ResendMailer $resendMailer,
        private readonly string $contactToEmail,
        private readonly string $contactFromEmail,
        private readonly string $contactLogoUrl,
        private readonly LoggerInterface $logger,
    ) {
    }

    #[OA\Post(
        path: "/api/contact",
        summary: "Enviar formulario de contacto",
        tags: ["Contact"],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ["name", "email", "clientType", "phone", "message"],
                properties: [
                    new OA\Property(property: "name", type: "string", example: "Juan Pérez"),
                    new OA\Property(property: "email", type: "string", example: "juan@example.com"),
                    new OA\Property(
                        property: "clientType",
                        type: "string",
                        enum: ["particular", "empresa"],
                        example: "particular"
                    ),
                    new OA\Property(property: "phone", type: "string", example: "+34123456789"),
                    new OA\Property(
                        property: "message",
                        type: "string",
                        example: "Me gustaría recibir más información sobre sus productos."
                    )
                ]
            )
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: "Mensaje enviado correctamente",
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: "message", type: "string", example: "Mensaje enviado correctamente")
                    ]
                )
            ),
            new OA\Response(response: 400, description: "Error de validación"),
            new OA\Response(response: 500, description: "Error al enviar el mensaje")
        ]
    )]
    #[Route('/api/contact', name: 'api_contact', methods: ['POST'])]
    public function contact(
        Request $request,
        ValidatorInterface $validator
    ): JsonResponse {
        $data = json_decode($request->getContent(), true);

        if (!is_array($data)) {
            return new JsonResponse([
                'error' => 'JSON inválido.'
            ], 400);
        }

        // Validate input
        $constraints = new Assert\Collection([
            'name' => [
                new Assert\NotBlank(message: 'El nombre es obligatorio.'),
                new Assert\Length(
                    min: 2,
                    max: 100,
                    minMessage: 'El nombre debe tener al menos {{ limit }} caracteres.',
                    maxMessage: 'El nombre no puede superar los {{ limit }} caracteres.'
                ),
            ],
            'email' => [
                new Assert\NotBlank(message: 'El email es obligatorio.'),
                new Assert\Email(message: 'El email no es válido.'),
            ],
            'clientType' => [
                new Assert\NotBlank(message: 'El tipo de cliente es obligatorio.'),
                new Assert\Choice(
                    choices: ['particular', 'empresa'],
                    message: 'El tipo de cliente debe ser "particular" o "empresa".'
                ),
            ],
            'phone' => [
                new Assert\NotBlank(message: 'El teléfono es obligatorio.'),
                new Assert\Length(
                    min: 7,
                    max: 30,
                    minMessage: 'El teléfono debe tener al menos {{ limit }} caracteres.',
                    maxMessage: 'El teléfono no puede superar los {{ limit }} caracteres.'
                ),
            ],
            'message' => [
                new Assert\NotBlank(message: 'El mensaje es obligatorio.'),
                new Assert\Length(
                    min: 10,
                    max: 2000,
                    minMessage: 'El mensaje debe tener al menos {{ limit }} caracteres.',
                    maxMessage: 'El mensaje no puede superar los {{ limit }} caracteres.'
                ),
            ],
        ]);

        $violations = $validator->validate($data, $constraints);

        if (count($violations) > 0) {
            $errors = [];
            foreach ($violations as $violation) {
                $errors[] = $violation->getMessage();
            }

            return new JsonResponse([
                'errors' => $errors
            ], 400);
        }

        // Sanitize input
        $name = trim($data['name']);
        $email = trim($data['email']);
        $clientType = $data['clientType'];
        $phone = trim($data['phone']);
        $message = trim($data['message']);

        // Build email content
        $clientTypeLabel = $clientType === 'empresa' ? 'Empresa' : 'Particular';

        $htmlBody = $this->renderView('emails/contact_notification.html.twig', [
            'name'       => $name,
            'email'      => $email,
            'clientType' => $clientTypeLabel,
            'phone'      => $phone,
            'message'    => $message,
            'logoUrl'    => $this->contactLogoUrl,
            'adminEmail' => $this->contactToEmail,
        ]);
        $textBody = $this->buildTextEmail($name, $email, $clientTypeLabel, $phone, $message);

        // Send email
        try {
            $this->resendMailer->send(
                [$this->contactToEmail],
                "Nuevo mensaje de contacto de {$name}",
                $htmlBody,
                $textBody
            );

            return new JsonResponse([
                'message' => 'Mensaje enviado correctamente.'
            ]);
        } catch (\Throwable $e) {
            $this->logger->error('Failed to send contact form email', [
                'name' => $name,
                'email' => $email,
                'error' => $e->getMessage(),
            ]);

            return new JsonResponse([
                'error' => 'No se pudo enviar el mensaje. Por favor, inténtalo de nuevo más tarde.'
            ], 500);
        }
    }

    private function buildTextEmail(
        string $name,
        string $email,
        string $clientType,
        string $phone,
        string $message
    ): string {
        return "CITRIBIO - Nuevo mensaje de contacto\n\n" .
            "Has recibido un nuevo mensaje desde el formulario de contacto:\n\n" .
            "Nombre: {$name}\n" .
            "Email: {$email}\n" .
            "Tipo de cliente: {$clientType}\n" .
            "Teléfono: {$phone}\n\n" .
            "Mensaje:\n{$message}\n\n" .
            "---\n" .
            "© " . date('Y') . " Citribio";
    }
}
