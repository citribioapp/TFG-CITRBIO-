<?php

namespace App\Controller;

use App\Entity\CustomerOrder;
use App\Service\ResendMailer;
use Doctrine\ORM\EntityManagerInterface;
use OpenApi\Attributes as OA;
use Psr\Log\LoggerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;

/**
 * Public endpoints — no authentication required.
 * Intentionally has NO class-level #[IsGranted] annotation.
 */
#[Route('/api/orders')]
class PublicOrderPaymentController extends AbstractController
{
    public function __construct(
        private readonly LoggerInterface $logger,
        private readonly ResendMailer $mailer,
        private readonly string $orderNotificationTo,
        private readonly string $orderNotificationFrom,
        private readonly string $frontendUrl,
        private readonly string $logoGrandeUrl,
    ) {
    }

    // ── GET: public order summary ────────────────────────────────────────────

    #[OA\Get(
        path: '/api/orders/{id}/payment-proof',
        summary: 'Resumen público de pedido para confirmar pago (sin login)',
        tags: ['Orders'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
            new OA\Parameter(name: 'token', in: 'query', required: true, schema: new OA\Schema(type: 'string')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Resumen público del pedido'),
            new OA\Response(response: 400, description: 'Estado del pedido no válido para este enlace'),
            new OA\Response(response: 403, description: 'Token inválido o no autorizado'),
            new OA\Response(response: 404, description: 'Pedido no encontrado'),
        ]
    )]
    #[Route('/{id}/payment-proof', name: 'api_orders_payment_proof', methods: ['GET'])]
    public function paymentProof(int $id, Request $request, EntityManagerInterface $em): JsonResponse
    {
        $token = trim((string) $request->query->get('token', ''));

        $this->logger->info('payment-proof GET: request received.', [
            'orderId'      => $id,
            'tokenPresent' => $token !== '',
        ]);

        $order = $em->getRepository(CustomerOrder::class)->find($id);

        if (!$order) {
            $this->logger->warning('payment-proof GET: order not found.', ['orderId' => $id]);
            return new JsonResponse(['error' => 'Pedido no encontrado.'], 404);
        }

        $tokenMatch = $token !== ''
            && $order->getPaymentToken() !== null
            && hash_equals($order->getPaymentToken(), $token);

        $this->logger->info('payment-proof GET: order found.', [
            'orderId'    => $id,
            'status'     => $order->getStatus(),
            'tokenMatch' => $tokenMatch,
        ]);

        if (!$tokenMatch) {
            return new JsonResponse(['error' => 'Token inválido o no autorizado.'], 403);
        }

        if ($order->getStatus() !== 'quote_sent') {
            return new JsonResponse([
                'error' => 'Este enlace solo es válido para pedidos con presupuesto enviado.',
            ], 400);
        }

        $user = $order->getUser();
        $customerName = trim(($user?->getName() ?? '') . ' ' . ($user?->getLastName() ?? ''));
        $transferReference = 'Pedido #' . $order->getId() . ' - ' . $customerName;

        return new JsonResponse([
            'orderId'           => $order->getId(),
            'customerName'      => $customerName ?: 'N/D',
            'totalPrice'        => $order->getTotalPrice(),
            'transferReference' => $transferReference,
            'status'            => $order->getStatus(),
        ]);
    }

    // ── POST: upload payment proof + notify admin ────────────────────────────

    #[OA\Post(
        path: '/api/orders/{id}/payment-proof',
        summary: 'Subir justificante de pago y notificar al admin (sin login)',
        tags: ['Orders'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
            new OA\Parameter(name: 'token', in: 'query', required: true, schema: new OA\Schema(type: 'string')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Justificante recibido y admin notificado'),
            new OA\Response(response: 400, description: 'Archivo inválido o estado incorrecto'),
            new OA\Response(response: 403, description: 'Token inválido'),
            new OA\Response(response: 404, description: 'Pedido no encontrado'),
        ]
    )]
    #[Route('/{id}/payment-proof', name: 'api_orders_payment_proof_upload', methods: ['POST'])]
    public function uploadPaymentProof(int $id, Request $request, EntityManagerInterface $em): JsonResponse
    {
        $token = trim((string) $request->query->get('token', ''));

        $this->logger->info('payment-proof POST: upload request.', [
            'orderId'      => $id,
            'tokenPresent' => $token !== '',
        ]);

        // 1. Find order
        $order = $em->getRepository(CustomerOrder::class)->find($id);
        if (!$order) {
            return new JsonResponse(['error' => 'Pedido no encontrado.'], 404);
        }

        // 2. Validate token
        $tokenMatch = $token !== ''
            && $order->getPaymentToken() !== null
            && hash_equals($order->getPaymentToken(), $token);

        if (!$tokenMatch) {
            return new JsonResponse(['error' => 'Token inválido o no autorizado.'], 403);
        }

        // 3. Validate status
        if ($order->getStatus() !== 'quote_sent') {
            return new JsonResponse([
                'error' => 'Este enlace solo es válido para pedidos con presupuesto enviado.',
            ], 400);
        }

        // 4. Validate file — accept both 'paymentProof' and 'proof' field names
        /** @var UploadedFile|null $file */
        $file = $request->files->get('paymentProof') ?? $request->files->get('proof');

        if (!$file) {
            return new JsonResponse(['error' => 'No se recibió ningún archivo.'], 400);
        }

        $allowedMimes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
        if (!in_array($file->getMimeType(), $allowedMimes, true)) {
            return new JsonResponse(['error' => 'Solo se permiten archivos PDF, JPG o PNG.'], 400);
        }

        $maxBytes = 5 * 1024 * 1024;
        if ($file->getSize() > $maxBytes) {
            return new JsonResponse(['error' => 'El archivo no puede superar los 5 MB.'], 400);
        }

        // 5. Store file — replace any previous proof for this order
        $uploadDir = $this->getParameter('kernel.project_dir') . '/public/uploads/payment-proofs';
        $ext = $file->guessExtension() ?? 'bin';
        $filename = 'pedido-' . $id . '-' . bin2hex(random_bytes(8)) . '.' . $ext;

        // Delete previous proof file if it exists
        $previousFilename = $order->getPaymentProofFilename();
        if ($previousFilename) {
            $previousPath = $uploadDir . '/' . $previousFilename;
            if (file_exists($previousPath)) {
                @unlink($previousPath);
            }
        }

        try {
            $file->move($uploadDir, $filename);
        } catch (\Throwable $e) {
            $this->logger->error('payment-proof POST: file move failed.', [
                'orderId' => $id,
                'error'   => $e->getMessage(),
            ]);
            return new JsonResponse(['error' => 'No se pudo guardar el archivo. Inténtalo de nuevo.'], 500);
        }

        $this->logger->info('payment-proof POST: file saved.', [
            'orderId'  => $id,
            'filename' => $filename,
        ]);

        // 6. Persist proof metadata
        $now = new \DateTimeImmutable();
        $order->setPaymentProofFilename($filename);
        $order->setPaymentProofUploadedAt($now);
        $order->setUpdatedAt($now);

        // 7. Send admin notification (throttle: skip if already sent in the last 5 minutes)
        $emailSent = false;
        $lastSent = $order->getPaymentNoticeSentAt();
        $throttleSeconds = 300; // 5 minutes
        $shouldSendEmail = $lastSent === null
            || ($now->getTimestamp() - $lastSent->getTimestamp()) > $throttleSeconds;

        if ($shouldSendEmail) {
            $user = $order->getUser();
            $customerName = trim(($user?->getName() ?? '') . ' ' . ($user?->getLastName() ?? ''));
            $transferReference = 'Pedido #' . $order->getId() . ' - ' . $customerName;
            $reviewUrl = rtrim($this->frontendUrl, '/') . '/admin/pedidos/' . $order->getId() . '/revisar';

            // Build items data for the email
            $itemsForEmail = [];
            foreach ($order->getItems() as $item) {
                $itemsForEmail[] = [
                    'product'   => $item->getProductNameSnapshot(),
                    'caliber'   => $item->getCaliberSnapshot() ?? '-',
                    'quality'   => $item->getQualitySnapshot() ?? '-',
                    'format'    => $item->getFormatSnapshot() ?? '-',
                    'quantity'  => $item->getQuantity(),
                    'unitPrice' => $item->getUnitPrice(),
                    'lineTotal' => $item->getLineTotal(),
                ];
            }

            $htmlBody = $this->renderView('emails/payment_proof_notification.html.twig', [
                'order'             => $order,
                'customer'          => $user,
                'customerName'      => $customerName,
                'items'             => $itemsForEmail,
                'productsSubtotal'  => $order->getProductsSubtotal(),
                'shippingPrice'     => $order->getShippingPrice(),
                'totalPrice'        => $order->getTotalPrice(),
                'transferReference' => $transferReference,
                'reviewUrl'         => $reviewUrl,
                'logoUrl'           => $this->logoGrandeUrl,
                'proofFilename'     => $filename,
            ]);

            $plainText =
                "El cliente ha indicado que ya ha realizado el pago del pedido #" . $order->getId() . ".\n\n" .
                "Cliente: " . $customerName . "\n" .
                "Email: " . ($user?->getEmail() ?? 'N/D') . "\n" .
                "Teléfono: " . ($user?->getPhone() ?? 'N/D') . "\n" .
                "Dirección: " . $order->getDeliveryAddressSnapshot() . "\n\n" .
                "Total: " . number_format((float) $order->getTotalPrice(), 2, ',', '.') . " €\n" .
                "Concepto: " . $transferReference . "\n\n" .
                "Revisar pedido: " . $reviewUrl;

            try {
                $this->mailer->send(
                    [$this->orderNotificationTo],
                    'Justificante recibido — Pedido #' . $order->getId(),
                    $htmlBody,
                    $plainText,
                );
                $order->setPaymentNoticeSentAt($now);
                $emailSent = true;
                $this->logger->info('payment-proof POST: admin notification sent.', ['orderId' => $id]);
            } catch (\Throwable $e) {
                $this->logger->error('payment-proof POST: admin email failed.', [
                    'orderId' => $id,
                    'error'   => $e->getMessage(),
                ]);
            }
        } else {
            $this->logger->info('payment-proof POST: admin email throttled.', [
                'orderId'      => $id,
                'lastSentAgo'  => $now->getTimestamp() - $lastSent->getTimestamp() . 's',
            ]);
        }

        $em->flush();

        return new JsonResponse([
            'message'   => 'Justificante recibido correctamente.',
            'emailSent' => $emailSent,
        ]);
    }
}
