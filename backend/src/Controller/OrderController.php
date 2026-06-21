<?php

namespace App\Controller;

use App\Entity\Cart;
use App\Entity\CustomerOrder;
use App\Entity\OrderItem;
use App\Entity\User;
use App\Service\ResendMailer;
use Doctrine\ORM\EntityManagerInterface;
use OpenApi\Attributes as OA;
use Psr\Log\LoggerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/orders')]
#[IsGranted('ROLE_USER')]
class OrderController extends AbstractController
{
    public function __construct(
        private readonly string $orderNotificationFrom,
        private readonly string $orderNotificationTo,
        private readonly string $frontendUrl,
        private readonly string $logoGrandeUrl,
        private readonly string $logoPequenoUrl,
        private readonly string $bankIban,
        private readonly LoggerInterface $logger,
    ) {
    }

    // ── Create order from active cart ────────────────────────────────────────

    #[OA\Post(
        path: '/api/orders',
        summary: 'Crear un pedido desde la cesta activa',
        tags: ['Orders']
    )]
    #[Route('', name: 'api_orders_create', methods: ['POST'])]
    public function create(EntityManagerInterface $em, ResendMailer $mailer): JsonResponse
    {
        $user = $this->getUser();

        if (!$user instanceof User) {
            return new JsonResponse(['error' => 'Usuario no válido'], 401);
        }

        $cart = $em->getRepository(Cart::class)->findOneBy([
            'user' => $user,
            'status' => 'active',
        ]);

        if (!$cart || count($cart->getItems()) === 0) {
            return new JsonResponse(['error' => 'La cesta está vacía'], 400);
        }

        $deliveryAddress = trim((string) $user->getDeliveryAddress());

        if ($deliveryAddress === '') {
            return new JsonResponse([
                'error' => 'Debes completar tu dirección de entrega antes de finalizar el pedido.',
            ], 400);
        }

        $order = new CustomerOrder();
        $order->setUser($user);
        $order->setStatus('under_review');
        $order->setDeliveryAddressSnapshot($deliveryAddress);
        $order->setCreatedAt(new \DateTimeImmutable());
        $order->setUpdatedAt(new \DateTimeImmutable());

        $em->persist($order);

        $itemsData = [];
        $lines = [];
        $index = 1;

        foreach ($cart->getItems() as $cartItem) {
            $item = new OrderItem();
            $item->setCustomerOrder($order);
            $item->setProduct($cartItem->getProduct());
            $item->setProductNameSnapshot($cartItem->getProduct()?->getName() ?? '');
            $item->setCaliberSnapshot($cartItem->getCaliber()?->getName());
            $item->setQualitySnapshot($cartItem->getQuality()?->getName());
            $item->setFormatSnapshot($cartItem->getFormat()?->getName());
            $item->setQuantity($cartItem->getQuantity());
            $item->setCreatedAt(new \DateTimeImmutable());
            $item->setUpdatedAt(new \DateTimeImmutable());

            $order->addItem($item);
            $em->persist($item);

            $itemData = [
                'line' => $index,
                'product' => $cartItem->getProduct()?->getName() ?? 'Sin nombre',
                'category' => $cartItem->getProduct()?->getCategory()?->getName() ?? '-',
                'caliber' => $cartItem->getCaliber()?->getName() ?? '-',
                'quality' => $cartItem->getQuality()?->getName() ?? '-',
                'format' => $cartItem->getFormat()?->getName() ?? '-',
                'quantity' => $cartItem->getQuantity(),
            ];

            $itemsData[] = $itemData;
            $lines[] =
                "Línea {$index}" . PHP_EOL .
                'Producto: ' . $itemData['product'] . PHP_EOL .
                'Categoría: ' . $itemData['category'] . PHP_EOL .
                'Calibre: ' . $itemData['caliber'] . PHP_EOL .
                'Calidad: ' . $itemData['quality'] . PHP_EOL .
                'Formato: ' . $itemData['format'] . PHP_EOL .
                'Cantidad: ' . $itemData['quantity'];

            $index++;
        }

        $cart->setStatus('ordered');
        $cart->setUpdatedAt(new \DateTimeImmutable());

        $em->flush();

        $body = 
            "Se ha confirmado un nuevo pedido.\n\n" .
            "Datos del cliente:\n" .
            "ID usuario: " . $user->getId() . "\n" .
            "Nombre: " . ($user->getName() ?? 'N/D') . "\n" .
            "Apellidos: " . ($user->getLastName() ?? 'N/D') . "\n" .
            "Email: " . ($user->getEmail() ?? 'N/D') . "\n" .
            "Teléfono: " . ($user->getPhone() ?? 'N/D') . "\n" .
            "DNI: " . ($user->getDni() ?? 'N/D') . "\n" .
            "Dirección de entrega: " . $order->getDeliveryAddressSnapshot() . "\n\n" .
            "Datos del pedido:\n" .
            "Pedido ID: " . $order->getId() . "\n" .
            "Estado: " . $order->getStatus() . "\n" .
            "Fecha: " . $order->getCreatedAt()->format('Y-m-d H:i:s') . "\n\n" .
            "Productos solicitados:\n\n" .
            implode("\n\n---------------------\n\n", $lines);

        $reviewUrl = rtrim($this->frontendUrl, '/') . '/admin/pedidos/' . $order->getId() . '/revisar';

        $htmlBody = $this->renderView('emails/order_confirmation.html.twig', [
            'order'          => $order,
            'user'           => $user,
            'items'          => $itemsData,
            'logoGrandeUrl'  => $this->logoGrandeUrl,
            'logoPequenoUrl' => $this->logoPequenoUrl,
            'reviewUrl'      => $reviewUrl,
        ]);

        try {
            $mailer->send(
                [$this->orderNotificationTo],
                'Nuevo pedido confirmado #' . $order->getId(),
                $htmlBody,
                $body,
            );
        } catch (\Throwable $e) {
            $this->logger->error('No se pudo enviar el email del pedido.', [
                'orderId' => $order->getId(),
                'userId' => $user->getId(),
                'error' => $e->getMessage(),
            ]);

            return new JsonResponse([
                'message' => 'Pedido creado correctamente',
                'orderId' => $order->getId(),
                'emailSent' => false,
                'warning' => 'El pedido se guardó, pero no se pudo enviar el email de notificación.',
            ], 201);
        }

        return new JsonResponse([
            'message' => 'Pedido creado correctamente',
            'orderId' => $order->getId(),
            'emailSent' => true,
        ], 201);
    }

    // ── List orders for the authenticated customer ───────────────────────────

    #[OA\Get(
        path: '/api/orders',
        summary: 'Listar pedidos del usuario',
        tags: ['Orders']
    )]
    #[Route('', name: 'api_orders_list', methods: ['GET'])]
    public function list(EntityManagerInterface $em): JsonResponse
    {
        $user = $this->getUser();

        if (!$user instanceof User) {
            return new JsonResponse(['error' => 'Usuario no válido'], 401);
        }

        $orders = $em->getRepository(CustomerOrder::class)->findBy(
            ['user' => $user],
            ['id' => 'DESC']
        );

        $data = [];

        foreach ($orders as $order) {
            $items = [];
            foreach ($order->getItems() as $item) {
                $items[] = [
                    'id' => $item->getId(),
                    'product' => $item->getProductNameSnapshot(),
                    'category' => $item->getProduct()?->getCategory()?->getName() ?? '-',
                    'caliber' => $item->getCaliberSnapshot() ?? '-',
                    'quality' => $item->getQualitySnapshot() ?? '-',
                    'format' => $item->getFormatSnapshot() ?? '-',
                    'quantity' => $item->getQuantity(),
                    'unitPrice' => $item->getUnitPrice(),
                    'lineTotal' => $item->getLineTotal(),
                ];
            }

            $data[] = [
                'id' => $order->getId(),
                'status' => $order->getStatus(),
                'deliveryAddress' => $order->getDeliveryAddressSnapshot(),
                'createdAt' => $order->getCreatedAt()->format('Y-m-d H:i:s'),
                'shippingPrice' => $order->getShippingPrice(),
                'productsSubtotal' => $order->getProductsSubtotal(),
                'totalPrice' => $order->getTotalPrice(),
                'items' => $items,
            ];
        }

        return $this->json($data);
    }

    // ── Admin: list all orders ───────────────────────────────────────────────

    #[OA\Get(
        path: '/api/orders/admin',
        summary: 'Listar todos los pedidos para administración',
        tags: ['Orders']
    )]
    #[IsGranted('ROLE_ADMIN')]
    #[Route('/admin', name: 'api_orders_admin_list', methods: ['GET'])]
    public function listForAdmin(EntityManagerInterface $em): JsonResponse
    {
        $orders = $em->getRepository(CustomerOrder::class)->findBy([], ['id' => 'DESC']);
        $data = [];

        foreach ($orders as $order) {
            $items = [];
            foreach ($order->getItems() as $item) {
                $items[] = [
                    'id' => $item->getId(),
                    'product' => $item->getProductNameSnapshot(),
                    'category' => $item->getProduct()?->getCategory()?->getName() ?? '-',
                    'caliber' => $item->getCaliberSnapshot() ?? '-',
                    'quality' => $item->getQualitySnapshot() ?? '-',
                    'format' => $item->getFormatSnapshot() ?? '-',
                    'quantity' => $item->getQuantity(),
                    'unitPrice' => $item->getUnitPrice(),
                    'lineTotal' => $item->getLineTotal(),
                ];
            }

            $user = $order->getUser();

            $data[] = [
                'id' => $order->getId(),
                'status' => $order->getStatus(),
                'deliveryAddress' => $order->getDeliveryAddressSnapshot(),
                'createdAt' => $order->getCreatedAt()->format('Y-m-d H:i:s'),
                'shippingPrice' => $order->getShippingPrice(),
                'productsSubtotal' => $order->getProductsSubtotal(),
                'totalPrice' => $order->getTotalPrice(),
                'customer' => [
                    'id' => $user?->getId(),
                    'name' => trim(($user?->getName() ?? '') . ' ' . ($user?->getLastName() ?? '')),
                    'email' => $user?->getEmail(),
                    'phone' => $user?->getPhone(),
                ],
                'items' => $items,
            ];
        }

        return $this->json($data);
    }

    // ── Admin: get single order detail ───────────────────────────────────────

    #[OA\Get(
        path: '/api/orders/{id}/admin',
        summary: 'Obtener detalle completo de un pedido (admin)',
        tags: ['Orders'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        responses: [
            new OA\Response(response: 200, description: 'Detalle del pedido'),
            new OA\Response(response: 404, description: 'Pedido no encontrado'),
        ]
    )]
    #[IsGranted('ROLE_ADMIN')]
    #[Route('/{id}/admin', name: 'api_orders_admin_get', methods: ['GET'])]
    public function getForAdmin(int $id, EntityManagerInterface $em): JsonResponse
    {
        $order = $em->getRepository(CustomerOrder::class)->find($id);

        if (!$order) {
            return new JsonResponse(['error' => 'Pedido no encontrado'], 404);
        }

        return $this->json($this->serializeOrderForAdmin($order));
    }

    // ── Admin: save quote and email customer ─────────────────────────────────

    #[OA\Put(
        path: '/api/admin/orders/{id}/quote',
        summary: 'Guardar presupuesto y enviar al cliente (admin)',
        tags: ['Orders'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['items', 'shippingPrice'],
                properties: [
                    new OA\Property(
                        property: 'items',
                        type: 'array',
                        items: new OA\Items(
                            required: ['orderItemId', 'unitPrice'],
                            properties: [
                                new OA\Property(property: 'orderItemId', type: 'integer', example: 1),
                                new OA\Property(property: 'unitPrice', type: 'number', format: 'float', example: 12.50),
                            ]
                        )
                    ),
                    new OA\Property(property: 'shippingPrice', type: 'number', format: 'float', example: 6.90),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Presupuesto guardado y enviado correctamente'),
            new OA\Response(response: 400, description: 'Datos inválidos o estado no permitido'),
            new OA\Response(response: 404, description: 'Pedido no encontrado'),
        ]
    )]
    #[IsGranted('ROLE_ADMIN')]
    #[Route('/{id}/quote', name: 'api_admin_orders_save_quote', methods: ['PUT'])]
    public function saveQuote(int $id, Request $request, EntityManagerInterface $em, ResendMailer $mailer): JsonResponse
    {
        // 1. Find order
        $order = $em->getRepository(CustomerOrder::class)->find($id);

        if (!$order) {
            return new JsonResponse(['error' => 'Pedido no encontrado'], 404);
        }

        // 2. Status guard — only under_review or quote_sent allow re-quoting
        $allowedStatuses = ['under_review', 'quote_sent'];
        if (!in_array($order->getStatus(), $allowedStatuses, true)) {
            return new JsonResponse([
                'error' => sprintf(
                    'No se puede guardar un presupuesto para un pedido con estado "%s". Solo se permite en: %s.',
                    $order->getStatus(),
                    implode(', ', $allowedStatuses)
                ),
            ], 400);
        }

        $data = json_decode($request->getContent(), true);

        // 3. Validate shippingPrice
        if (!array_key_exists('shippingPrice', $data) || !is_numeric($data['shippingPrice']) || (float) $data['shippingPrice'] < 0) {
            return new JsonResponse(['error' => 'shippingPrice debe ser un número mayor o igual a 0.'], 400);
        }

        // 4. Validate items array presence
        if (empty($data['items']) || !is_array($data['items'])) {
            return new JsonResponse(['error' => 'Se requiere el array "items" con al menos un elemento.'], 400);
        }

        // 5. Build and validate the price map: orderItemId => unitPrice
        $priceMap = [];
        foreach ($data['items'] as $index => $entry) {
            if (!isset($entry['orderItemId']) || !is_int($entry['orderItemId'])) {
                return new JsonResponse(['error' => sprintf('items[%d]: "orderItemId" debe ser un entero.', $index)], 400);
            }
            if (!array_key_exists('unitPrice', $entry) || !is_numeric($entry['unitPrice']) || (float) $entry['unitPrice'] < 0) {
                return new JsonResponse(['error' => sprintf('items[%d]: "unitPrice" debe ser un número mayor o igual a 0.', $index)], 400);
            }
            $priceMap[(int) $entry['orderItemId']] = round((float) $entry['unitPrice'], 2);
        }

        // 6. Verify every order item has a price in the payload
        foreach ($order->getItems() as $item) {
            if (!isset($priceMap[$item->getId()])) {
                return new JsonResponse([
                    'error' => sprintf('Falta el precio para el producto "%s" (orderItemId: %d).', $item->getProductNameSnapshot(), $item->getId()),
                ], 400);
            }
        }

        // 7. Apply prices, compute line totals and products subtotal
        $productsSubtotal = 0.0;
        $itemsForEmail = [];

        foreach ($order->getItems() as $item) {
            $unitPrice = $priceMap[$item->getId()];
            $lineTotal = round($unitPrice * (int) $item->getQuantity(), 2);

            $item->setUnitPrice($unitPrice);
            $item->setLineTotal($lineTotal);
            $item->setUpdatedAt(new \DateTimeImmutable());

            $productsSubtotal += $lineTotal;

            $itemsForEmail[] = [
                'product' => $item->getProductNameSnapshot(),
                'caliber' => $item->getCaliberSnapshot() ?? '-',
                'quality' => $item->getQualitySnapshot() ?? '-',
                'format' => $item->getFormatSnapshot() ?? '-',
                'quantity' => $item->getQuantity(),
                'unitPrice' => $unitPrice,
                'lineTotal' => $lineTotal,
            ];
        }

        $productsSubtotal = round($productsSubtotal, 2);
        $shippingPrice = round((float) $data['shippingPrice'], 2);
        $totalPrice = round($productsSubtotal + $shippingPrice, 2);

        // 8. Persist order-level totals and advance status
        $order->setProductsSubtotal($productsSubtotal);
        $order->setShippingPrice($shippingPrice);
        $order->setTotalPrice($totalPrice);
        $order->setStatus('quote_sent');
        $order->setUpdatedAt(new \DateTimeImmutable());

        // Generate a secure payment token so the customer can confirm payment without logging in
        $paymentToken = $order->ensurePaymentToken();

        $em->flush();

        // 9. Send quote email to customer
        $customer = $order->getUser();
        $customerEmail = $customer?->getEmail();
        $emailSent = false;
        $emailWarning = null;

        $this->logger->info('Quote email: attempting to send.', [
            'orderId' => $order->getId(),
            'recipientEmail' => $customerEmail ?? 'NULL — user has no email',
            'fromAddress' => $this->orderNotificationFrom,
        ]);

        if (!$customerEmail || !filter_var($customerEmail, FILTER_VALIDATE_EMAIL)) {
            $this->logger->warning('Quote email: customer email is missing or invalid.', [
                'orderId' => $order->getId(),
                'customerEmail' => $customerEmail,
            ]);
            $emailWarning = 'El presupuesto se guardó correctamente, pero el email del cliente no es válido o está vacío.';
        } else {
            $customerName = trim(($customer->getName() ?? '') . ' ' . ($customer->getLastName() ?? ''));
            $transferReference = 'Pedido #' . $order->getId() . ' - ' . $customerName;
            $paymentUrl = rtrim($this->frontendUrl, '/') . '/pedido/' . $order->getId() . '/pago-realizado?token=' . $paymentToken;

            $htmlBody = $this->renderView('emails/quote_notification.html.twig', [
                'order'             => $order,
                'customer'          => $customer,
                'items'             => $itemsForEmail,
                'productsSubtotal'  => $productsSubtotal,
                'shippingPrice'     => $shippingPrice,
                'totalPrice'        => $totalPrice,
                'logoUrl'           => $this->logoGrandeUrl,
                'bankIban'          => $this->bankIban,
                'transferReference' => $transferReference,
                'paymentUrl'        => $paymentUrl,
            ]);

            $plainText =
                "Hola " . ($customer->getName() ?? '') . ",\n\n" .
                "Tu pedido #" . $order->getId() . " ha sido revisado. Aquí tienes el presupuesto:\n\n" .
                "Subtotal productos: " . number_format($productsSubtotal, 2, ',', '.') . " €\n" .
                "Gastos de envío: " . number_format($shippingPrice, 2, ',', '.') . " €\n" .
                "Total: " . number_format($totalPrice, 2, ',', '.') . " €\n\n" .
                "Datos bancarios:\n" .
                "IBAN: " . $this->bankIban . "\n" .
                "Concepto: " . $transferReference . "\n\n" .
                "Una vez realizado el pago, confirma pulsando: " . $paymentUrl . "\n\n" .
                "Citribio";

            try {
                $mailer->send(
                    [$customerEmail],
                    'Tu presupuesto Citribio está listo — Pedido #' . $order->getId(),
                    $htmlBody,
                    $plainText,
                );
                $emailSent = true;
                $this->logger->info('Quote email sent successfully.', [
                    'orderId' => $order->getId(),
                    'recipient' => $customerEmail,
                ]);
            } catch (\Throwable $e) {
                $this->logger->error('Quote email send failed.', [
                    'orderId' => $order->getId(),
                    'recipient' => $customerEmail,
                    'fromAddress' => $this->orderNotificationFrom,
                    'error' => $e->getMessage(),
                    'note' => 'If using onboarding@resend.dev, Resend only allows sending to the account owner email. Configure a verified sending domain to send to arbitrary recipients.',
                ]);
                $emailWarning = 'El presupuesto se guardó correctamente, pero no se pudo enviar el email al cliente (' . $customerEmail . '). Revisa los logs del servidor para más detalles.';
            }
        }

        // 10. Return updated order
        $response = [
            'message' => 'Presupuesto guardado correctamente',
            'emailSent' => $emailSent,
            'order' => $this->serializeOrderForAdmin($order),
        ];

        if ($emailWarning !== null) {
            $response['warning'] = $emailWarning;
        }

        return new JsonResponse($response);
    }

    // ── Admin: update order status ───────────────────────────────────────────

    #[OA\Patch(
        path: '/api/orders/{id}/status',
        summary: 'Actualizar el estado de un pedido',
        tags: ['Orders'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['status'],
                properties: [
                    new OA\Property(
                        property: 'status',
                        type: 'string',
                        enum: ['under_review', 'quote_sent', 'payment_received', 'shipped'],
                        example: 'quote_sent'
                    )
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Estado actualizado correctamente'),
            new OA\Response(response: 400, description: 'Estado inválido'),
            new OA\Response(response: 404, description: 'Pedido no encontrado')
        ]
    )]
    #[IsGranted('ROLE_ADMIN')]
    #[Route('/{id}/status', name: 'api_orders_update_status', methods: ['PATCH'])]
    public function updateStatus(int $id, Request $request, EntityManagerInterface $em): JsonResponse
    {
        $order = $em->getRepository(CustomerOrder::class)->find($id);

        if (!$order) {
            return new JsonResponse(['error' => 'Pedido no encontrado'], 404);
        }

        $data = json_decode($request->getContent(), true);

        if (!isset($data['status']) || trim($data['status']) === '') {
            return new JsonResponse(['error' => 'El estado es obligatorio'], 400);
        }

        $allowedStatuses = ['under_review', 'quote_sent', 'payment_received', 'shipped'];
        $newStatus = trim(strtolower($data['status']));

        if (!in_array($newStatus, $allowedStatuses, true)) {
            return new JsonResponse([
                'error' => 'Estado inválido. Estados permitidos: ' . implode(', ', $allowedStatuses),
            ], 400);
        }

        $order->setStatus($newStatus);
        $order->setUpdatedAt(new \DateTimeImmutable());

        $em->flush();

        return new JsonResponse([
            'message' => 'Estado actualizado correctamente',
            'orderId' => $order->getId(),
            'status' => $order->getStatus(),
            'updatedAt' => $order->getUpdatedAt()->format('Y-m-d H:i:s'),
        ]);
    }

    // ── Private helpers ──────────────────────────────────────────────────────

    private function serializeOrderForAdmin(CustomerOrder $order): array
    {
        $user = $order->getUser();
        $items = [];

        foreach ($order->getItems() as $item) {
            $items[] = [
                'id' => $item->getId(),
                'product' => $item->getProductNameSnapshot(),
                'category' => $item->getProduct()?->getCategory()?->getName() ?? '-',
                'caliber' => $item->getCaliberSnapshot() ?? '-',
                'quality' => $item->getQualitySnapshot() ?? '-',
                'format' => $item->getFormatSnapshot() ?? '-',
                'quantity' => $item->getQuantity(),
                'unitPrice' => $item->getUnitPrice(),
                'lineTotal' => $item->getLineTotal(),
            ];
        }

        return [
            'id' => $order->getId(),
            'status' => $order->getStatus(),
            'deliveryAddress' => $order->getDeliveryAddressSnapshot(),
            'createdAt' => $order->getCreatedAt()->format('Y-m-d H:i:s'),
            'updatedAt' => $order->getUpdatedAt()->format('Y-m-d H:i:s'),
            'shippingPrice' => $order->getShippingPrice(),
            'productsSubtotal' => $order->getProductsSubtotal(),
            'totalPrice' => $order->getTotalPrice(),
            'customer' => [
                'id' => $user?->getId(),
                'name' => trim(($user?->getName() ?? '') . ' ' . ($user?->getLastName() ?? '')),
                'email' => $user?->getEmail(),
                'phone' => $user?->getPhone(),
            ],
            'items' => $items,
        ];
    }
}
