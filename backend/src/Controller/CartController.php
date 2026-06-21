<?php

namespace App\Controller;

use App\Entity\Cart;
use App\Entity\CartItem;
use App\Entity\Product;
use App\Entity\Caliber;
use App\Entity\Quality;
use App\Entity\Format;
use Doctrine\ORM\EntityManagerInterface;
use OpenApi\Attributes as OA;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/cart')]
#[IsGranted('ROLE_USER')]
class CartController extends AbstractController
{
    #[OA\Get(
        path: '/api/cart',
        summary: 'Obtener la cesta activa del usuario autenticado',
        tags: ['Cart'],
        responses: [
            new OA\Response(response: 200, description: 'Cesta obtenida correctamente'),
            new OA\Response(response: 401, description: 'No autenticado')
        ]
    )]
    #[Route('', name: 'api_cart_show', methods: ['GET'])]
    public function show(EntityManagerInterface $em): JsonResponse
    {
        $user = $this->getUser();

        $cart = $em->getRepository(Cart::class)->findOneBy([
            'user' => $user,
            'status' => 'active'
        ]);

        if (!$cart) {
            return $this->json([
                'message' => 'No existe una cesta activa',
                'items' => []
            ]);
        }

        $items = [];

        foreach ($cart->getItems() as $item) {
            $items[] = [
                'cartItemId' => $item->getId(),
                'quantity' => $item->getQuantity(),
                'product' => [
                    'id' => $item->getProduct()?->getId(),
                    'name' => $item->getProduct()?->getName(),
                    'image' => $this->resolveProductImage($item->getProduct()),
                ],
                'selection' => [
                    'caliber' => [
                        'id' => $item->getCaliber()?->getId(),
                        'name' => $item->getCaliber()?->getName(),
                    ],
                    'quality' => [
                        'id' => $item->getQuality()?->getId(),
                        'name' => $item->getQuality()?->getName(),
                    ],
                    'format' => [
                        'id' => $item->getFormat()?->getId(),
                        'name' => $item->getFormat()?->getName(),
                    ],
                ]
            ];
        }

        return $this->json([
            'cartId' => $cart->getId(),
            'status' => $cart->getStatus(),
            'items' => $items
        ]);
    }

    #[OA\Post(
        path: '/api/cart/items',
        summary: 'Añadir un producto con opciones al carrito',
        tags: ['Cart'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['productId', 'caliberId', 'qualityId', 'formatId', 'quantity'],
                properties: [
                    new OA\Property(property: 'productId', type: 'integer', example: 1),
                    new OA\Property(property: 'caliberId', type: 'integer', example: 3),
                    new OA\Property(property: 'qualityId', type: 'integer', example: 1),
                    new OA\Property(property: 'formatId', type: 'integer', example: 4),
                    new OA\Property(property: 'quantity', type: 'integer', example: 2)
                ]
            )
        ),
        responses: [
            new OA\Response(response: 201, description: 'Producto añadido al carrito'),
            new OA\Response(response: 400, description: 'Datos inválidos'),
            new OA\Response(response: 404, description: 'Producto u opciones no encontradas')
        ]
    )]
    #[Route('/items', name: 'api_cart_add_item', methods: ['POST'])]
    public function addItem(Request $request, EntityManagerInterface $em): JsonResponse
    {
        $user = $this->getUser();
        $data = json_decode($request->getContent(), true);

        $requiredFields = ['productId', 'caliberId', 'qualityId', 'formatId', 'quantity'];

        foreach ($requiredFields as $field) {
            if (!isset($data[$field])) {
                return new JsonResponse([
                    'error' => "El campo {$field} es obligatorio"
                ], 400);
            }
        }

        $quantity = (int) $data['quantity'];

        if ($quantity < 1) {
            return new JsonResponse([
                'error' => 'La cantidad debe ser mayor que 0'
            ], 400);
        }

        $product = $em->getRepository(Product::class)->find($data['productId']);
        if (!$product || !$product->isActive()) {
            return new JsonResponse(['error' => 'Producto no encontrado'], 404);
        }

        if ($product->isOutOfSeason()) {
            return new JsonResponse([
                'error' => 'Esta variedad está fuera de temporada y no puede añadirse al carrito.',
            ], 409);
        }

        $caliber = $em->getRepository(Caliber::class)->find($data['caliberId']);
        $quality = $em->getRepository(Quality::class)->find($data['qualityId']);
        $format = $em->getRepository(Format::class)->find($data['formatId']);

        if (!$caliber || $caliber->getProduct()?->getId() !== $product->getId()) {
            return new JsonResponse(['error' => 'El calibre no pertenece al producto'], 400);
        }

        if (!$quality || $quality->getProduct()?->getId() !== $product->getId()) {
            return new JsonResponse(['error' => 'La calidad no pertenece al producto'], 400);
        }

        if (!$format || $format->getProduct()?->getId() !== $product->getId()) {
            return new JsonResponse(['error' => 'El formato no pertenece al producto'], 400);
        }

        $cart = $em->getRepository(Cart::class)->findOneBy([
            'user' => $user,
            'status' => 'active'
        ]);

        if (!$cart) {
            $cart = new Cart();
            $cart->setUser($user);
            $cart->setStatus('active');
            $cart->setCreatedAt(new \DateTimeImmutable());
            $cart->setUpdatedAt(new \DateTimeImmutable());
            $em->persist($cart);
        }

        $existingItem = null;

        foreach ($cart->getItems() as $item) {
            if (
                $item->getProduct()?->getId() === $product->getId() &&
                $item->getCaliber()?->getId() === $caliber->getId() &&
                $item->getQuality()?->getId() === $quality->getId() &&
                $item->getFormat()?->getId() === $format->getId()
            ) {
                $existingItem = $item;
                break;
            }
        }

        if ($existingItem) {
            $existingItem->setQuantity($existingItem->getQuantity() + $quantity);
            $existingItem->setUpdatedAt(new \DateTimeImmutable());
        } else {
            $cartItem = new CartItem();
            $cartItem->setCart($cart);
            $cartItem->setProduct($product);
            $cartItem->setCaliber($caliber);
            $cartItem->setQuality($quality);
            $cartItem->setFormat($format);
            $cartItem->setQuantity($quantity);
            $cartItem->setCreatedAt(new \DateTimeImmutable());
            $cartItem->setUpdatedAt(new \DateTimeImmutable());

            $em->persist($cartItem);
        }

        $cart->setUpdatedAt(new \DateTimeImmutable());

        $em->flush();

        return new JsonResponse([
            'message' => 'Producto añadido al carrito correctamente'
        ], 201);
    }

    #[OA\Delete(
        path: '/api/cart/items/{id}',
        summary: 'Eliminar un item de la cesta',
        tags: ['Cart'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                required: true,
                schema: new OA\Schema(type: 'integer')
            )
        ],
        responses: [
            new OA\Response(response: 200, description: 'Item eliminado correctamente'),
            new OA\Response(response: 403, description: 'No autorizado'),
            new OA\Response(response: 404, description: 'Item no encontrado')
        ]
    )]
    #[Route('/items/{id}', name: 'api_cart_remove_item', methods: ['DELETE'])]
    public function removeItem(int $id, EntityManagerInterface $em): JsonResponse
    {
        $user = $this->getUser();

        $item = $em->getRepository(CartItem::class)->find($id);

        if (!$item) {
            return new JsonResponse([
                'error' => 'Item no encontrado'
            ], 404);
        }

        $cart = $item->getCart();

        if (!$cart || $cart->getUser() !== $user) {
            return new JsonResponse([
                'error' => 'No autorizado'
            ], 403);
        }

        $em->remove($item);
        $cart->setUpdatedAt(new \DateTimeImmutable());
        $em->flush();

        return new JsonResponse([
            'message' => 'Item eliminado de la cesta correctamente'
        ]);
    }

    private function resolveProductImage(?Product $product): ?string
    {
        if (!$product) {
            return null;
        }

        foreach ($product->getImages() as $image) {
            if ($image->isMain()) {
                return $image->getImagePath();
            }
        }

        if ($product->getImages()->count() > 0) {
            return $product->getImages()->first()->getImagePath();
        }

        return null;
    }
}
