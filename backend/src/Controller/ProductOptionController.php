<?php

namespace App\Controller;

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

#[Route('/api/products')]
class ProductOptionController extends AbstractController
{
    #[OA\Post(
        path: '/api/products/{id}/calibers',
        summary: 'Añadir un calibre a un producto',
        tags: ['Product Options'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                required: true,
                schema: new OA\Schema(type: 'integer')
            )
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['name'],
                properties: [
                    new OA\Property(property: 'name', type: 'string', example: 'Grande')
                ]
            )
        ),
        responses: [
            new OA\Response(response: 201, description: 'Calibre creado correctamente'),
            new OA\Response(response: 400, description: 'Datos inválidos'),
            new OA\Response(response: 404, description: 'Producto no encontrado')
        ]
    )]
    #[IsGranted('ROLE_ADMIN')]
    #[Route('/{id}/calibers', name: 'api_product_calibers_create', methods: ['POST'])]
    public function createCaliber(int $id, Request $request, EntityManagerInterface $em): JsonResponse
    {
        $product = $em->getRepository(Product::class)->find($id);

        if (!$product) {
            return new JsonResponse(['error' => 'Producto no encontrado'], 404);
        }

        $data = json_decode($request->getContent(), true);

        if (!isset($data['name']) || trim($data['name']) === '') {
            return new JsonResponse(['error' => 'El nombre es obligatorio'], 400);
        }

        $name = trim($data['name']);

        $existing = $em->getRepository(Caliber::class)->findOneBy([
            'product' => $product,
            'name' => $name
        ]);

        if ($existing) {
            return new JsonResponse(['error' => 'Ese calibre ya existe para este producto'], 400);
        }

        $caliber = new Caliber();
        $caliber->setName($name);
        $caliber->setProduct($product);

        $em->persist($caliber);
        $em->flush();

        return new JsonResponse([
            'message' => 'Calibre creado correctamente',
            'id' => $caliber->getId(),
            'name' => $caliber->getName(),
            'productId' => $product->getId()
        ], 201);
    }

    #[OA\Post(
        path: '/api/products/{id}/qualities',
        summary: 'Añadir una calidad a un producto',
        tags: ['Product Options'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                required: true,
                schema: new OA\Schema(type: 'integer')
            )
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['name'],
                properties: [
                    new OA\Property(property: 'name', type: 'string', example: 'Extra')
                ]
            )
        ),
        responses: [
            new OA\Response(response: 201, description: 'Calidad creada correctamente'),
            new OA\Response(response: 400, description: 'Datos inválidos'),
            new OA\Response(response: 404, description: 'Producto no encontrado')
        ]
    )]
    #[IsGranted('ROLE_ADMIN')]
    #[Route('/{id}/qualities', name: 'api_product_qualities_create', methods: ['POST'])]
    public function createQuality(int $id, Request $request, EntityManagerInterface $em): JsonResponse
    {
        $product = $em->getRepository(Product::class)->find($id);

        if (!$product) {
            return new JsonResponse(['error' => 'Producto no encontrado'], 404);
        }

        $data = json_decode($request->getContent(), true);

        if (!isset($data['name']) || trim($data['name']) === '') {
            return new JsonResponse(['error' => 'El nombre es obligatorio'], 400);
        }

        $name = trim($data['name']);

        $existing = $em->getRepository(Quality::class)->findOneBy([
            'product' => $product,
            'name' => $name
        ]);

        if ($existing) {
            return new JsonResponse(['error' => 'Esa calidad ya existe para este producto'], 400);
        }

        $quality = new Quality();
        $quality->setName($name);
        $quality->setProduct($product);

        $em->persist($quality);
        $em->flush();

        return new JsonResponse([
            'message' => 'Calidad creada correctamente',
            'id' => $quality->getId(),
            'name' => $quality->getName(),
            'productId' => $product->getId()
        ], 201);
    }

    #[OA\Post(
        path: '/api/products/{id}/formats',
        summary: 'Añadir un formato a un producto',
        tags: ['Product Options'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                required: true,
                schema: new OA\Schema(type: 'integer')
            )
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['name'],
                properties: [
                    new OA\Property(property: 'name', type: 'string', example: 'Caja 5kg')
                ]
            )
        ),
        responses: [
            new OA\Response(response: 201, description: 'Formato creado correctamente'),
            new OA\Response(response: 400, description: 'Datos inválidos'),
            new OA\Response(response: 404, description: 'Producto no encontrado')
        ]
    )]
    #[IsGranted('ROLE_ADMIN')]
    #[Route('/{id}/formats', name: 'api_product_formats_create', methods: ['POST'])]
    public function createFormat(int $id, Request $request, EntityManagerInterface $em): JsonResponse
    {
        $product = $em->getRepository(Product::class)->find($id);

        if (!$product) {
            return new JsonResponse(['error' => 'Producto no encontrado'], 404);
        }

        $data = json_decode($request->getContent(), true);

        if (!isset($data['name']) || trim($data['name']) === '') {
            return new JsonResponse(['error' => 'El nombre es obligatorio'], 400);
        }

        $name = trim($data['name']);

        $existing = $em->getRepository(Format::class)->findOneBy([
            'product' => $product,
            'name' => $name
        ]);

        if ($existing) {
            return new JsonResponse(['error' => 'Ese formato ya existe para este producto'], 400);
        }

        $format = new Format();
        $format->setName($name);
        $format->setProduct($product);

        $em->persist($format);
        $em->flush();

        return new JsonResponse([
            'message' => 'Formato creado correctamente',
            'id' => $format->getId(),
            'name' => $format->getName(),
            'productId' => $product->getId()
        ], 201);
    }

    #[OA\Get(
        path: '/api/products/{id}/options',
        summary: 'Obtener todas las opciones de un producto',
        tags: ['Product Options'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                required: true,
                schema: new OA\Schema(type: 'integer')
            )
        ],
        responses: [
            new OA\Response(response: 200, description: 'Opciones del producto'),
            new OA\Response(response: 404, description: 'Producto no encontrado')
        ]
    )]
    #[Route('/{id}/options', name: 'api_product_options_show', methods: ['GET'])]
    public function getOptions(int $id, EntityManagerInterface $em): JsonResponse
    {
        $product = $em->getRepository(Product::class)->find($id);

        if (!$product) {
            return new JsonResponse(['error' => 'Producto no encontrado'], 404);
        }

        $calibers = [];
        foreach ($product->getCalibers() as $caliber) {
            $calibers[] = [
                'id' => $caliber->getId(),
                'name' => $caliber->getName()
            ];
        }

        $qualities = [];
        foreach ($product->getQualities() as $quality) {
            $qualities[] = [
                'id' => $quality->getId(),
                'name' => $quality->getName()
            ];
        }

        $formats = [];
        foreach ($product->getFormats() as $format) {
            $formats[] = [
                'id' => $format->getId(),
                'name' => $format->getName()
            ];
        }

        return $this->json([
            'productId' => $product->getId(),
            'productName' => $product->getName(),
            'calibers' => $calibers,
            'qualities' => $qualities,
            'formats' => $formats,
        ]);
    }

    #[OA\Put(
        path: '/api/products/{productId}/calibers/{id}',
        summary: 'Actualizar el nombre de un calibre',
        tags: ['Product Options'],
        parameters: [
            new OA\Parameter(name: 'productId', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['name'],
                properties: [new OA\Property(property: 'name', type: 'string', example: 'Calibre 4')]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Calibre actualizado correctamente'),
            new OA\Response(response: 400, description: 'Datos inválidos'),
            new OA\Response(response: 404, description: 'Producto o calibre no encontrados')
        ]
    )]
    #[IsGranted('ROLE_ADMIN')]
    #[Route('/{productId}/calibers/{id}', name: 'api_product_calibers_update', methods: ['PUT'])]
    public function updateCaliber(int $productId, int $id, Request $request, EntityManagerInterface $em): JsonResponse
    {
        $product = $em->getRepository(Product::class)->find($productId);
        if (!$product) {
            return new JsonResponse(['error' => 'Producto no encontrado'], 404);
        }

        $caliber = $em->getRepository(Caliber::class)->find($id);
        if (!$caliber || $caliber->getProduct()?->getId() !== $product->getId()) {
            return new JsonResponse(['error' => 'Calibre no encontrado'], 404);
        }

        $data = json_decode($request->getContent(), true);
        $name = trim((string) ($data['name'] ?? ''));

        if ($name === '') {
            return new JsonResponse(['error' => 'El nombre es obligatorio'], 400);
        }

        $caliber->setName($name);
        $em->flush();

        return new JsonResponse([
            'message' => 'Calibre actualizado correctamente',
            'id' => $caliber->getId(),
            'name' => $caliber->getName(),
            'productId' => $product->getId(),
        ]);
    }

    #[OA\Put(
        path: '/api/products/{productId}/qualities/{id}',
        summary: 'Actualizar el nombre de una calidad',
        tags: ['Product Options'],
        parameters: [
            new OA\Parameter(name: 'productId', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['name'],
                properties: [new OA\Property(property: 'name', type: 'string', example: 'I Extra')]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Calidad actualizada correctamente'),
            new OA\Response(response: 400, description: 'Datos inválidos'),
            new OA\Response(response: 404, description: 'Producto o calidad no encontrados')
        ]
    )]
    #[IsGranted('ROLE_ADMIN')]
    #[Route('/{productId}/qualities/{id}', name: 'api_product_qualities_update', methods: ['PUT'])]
    public function updateQuality(int $productId, int $id, Request $request, EntityManagerInterface $em): JsonResponse
    {
        $product = $em->getRepository(Product::class)->find($productId);
        if (!$product) {
            return new JsonResponse(['error' => 'Producto no encontrado'], 404);
        }

        $quality = $em->getRepository(Quality::class)->find($id);
        if (!$quality || $quality->getProduct()?->getId() !== $product->getId()) {
            return new JsonResponse(['error' => 'Calidad no encontrada'], 404);
        }

        $data = json_decode($request->getContent(), true);
        $name = trim((string) ($data['name'] ?? ''));

        if ($name === '') {
            return new JsonResponse(['error' => 'El nombre es obligatorio'], 400);
        }

        $quality->setName($name);
        $em->flush();

        return new JsonResponse([
            'message' => 'Calidad actualizada correctamente',
            'id' => $quality->getId(),
            'name' => $quality->getName(),
            'productId' => $product->getId(),
        ]);
    }

    #[OA\Put(
        path: '/api/products/{productId}/formats/{id}',
        summary: 'Actualizar el nombre de un formato',
        tags: ['Product Options'],
        parameters: [
            new OA\Parameter(name: 'productId', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['name'],
                properties: [new OA\Property(property: 'name', type: 'string', example: 'Caja 10kg')]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Formato actualizado correctamente'),
            new OA\Response(response: 400, description: 'Datos inválidos'),
            new OA\Response(response: 404, description: 'Producto o formato no encontrados')
        ]
    )]
    #[IsGranted('ROLE_ADMIN')]
    #[Route('/{productId}/formats/{id}', name: 'api_product_formats_update', methods: ['PUT'])]
    public function updateFormat(int $productId, int $id, Request $request, EntityManagerInterface $em): JsonResponse
    {
        $product = $em->getRepository(Product::class)->find($productId);
        if (!$product) {
            return new JsonResponse(['error' => 'Producto no encontrado'], 404);
        }

        $format = $em->getRepository(Format::class)->find($id);
        if (!$format || $format->getProduct()?->getId() !== $product->getId()) {
            return new JsonResponse(['error' => 'Formato no encontrado'], 404);
        }

        $data = json_decode($request->getContent(), true);
        $name = trim((string) ($data['name'] ?? ''));

        if ($name === '') {
            return new JsonResponse(['error' => 'El nombre es obligatorio'], 400);
        }

        $format->setName($name);
        $em->flush();

        return new JsonResponse([
            'message' => 'Formato actualizado correctamente',
            'id' => $format->getId(),
            'name' => $format->getName(),
            'productId' => $product->getId(),
        ]);
    }

    #[OA\Delete(
        path: '/api/products/{productId}/calibers/{id}',
        summary: 'Eliminar un calibre de un producto',
        tags: ['Product Options'],
        parameters: [
            new OA\Parameter(
                name: 'productId',
                in: 'path',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
            new OA\Parameter(
                name: 'id',
                in: 'path',
                required: true,
                schema: new OA\Schema(type: 'integer')
            )
        ],
        responses: [
            new OA\Response(response: 200, description: 'Calibre eliminado correctamente'),
            new OA\Response(response: 404, description: 'Producto o calibre no encontrados')
        ]
    )]
    #[IsGranted('ROLE_ADMIN')]
    #[Route('/{productId}/calibers/{id}', name: 'api_product_calibers_delete', methods: ['DELETE'])]
    public function deleteCaliber(int $productId, int $id, EntityManagerInterface $em): JsonResponse
    {
        $product = $em->getRepository(Product::class)->find($productId);
        if (!$product) {
            return new JsonResponse(['error' => 'Producto no encontrado'], 404);
        }

        $caliber = $em->getRepository(Caliber::class)->find($id);
        if (!$caliber) {
            return new JsonResponse(['error' => 'Calibre no encontrado'], 404);
        }

        if ($caliber->getProduct()?->getId() !== $product->getId()) {
            return new JsonResponse(['error' => 'El calibre no pertenece a este producto'], 404);
        }

        $em->remove($caliber);
        $em->flush();

        return new JsonResponse(['message' => 'Calibre eliminado correctamente']);
    }

    #[OA\Delete(
        path: '/api/products/{productId}/qualities/{id}',
        summary: 'Eliminar una calidad de un producto',
        tags: ['Product Options'],
        parameters: [
            new OA\Parameter(
                name: 'productId',
                in: 'path',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
            new OA\Parameter(
                name: 'id',
                in: 'path',
                required: true,
                schema: new OA\Schema(type: 'integer')
            )
        ],
        responses: [
            new OA\Response(response: 200, description: 'Calidad eliminada correctamente'),
            new OA\Response(response: 404, description: 'Producto o calidad no encontrados')
        ]
    )]
    #[IsGranted('ROLE_ADMIN')]
    #[Route('/{productId}/qualities/{id}', name: 'api_product_qualities_delete', methods: ['DELETE'])]
    public function deleteQuality(int $productId, int $id, EntityManagerInterface $em): JsonResponse
    {
        $product = $em->getRepository(Product::class)->find($productId);
        if (!$product) {
            return new JsonResponse(['error' => 'Producto no encontrado'], 404);
        }

        $quality = $em->getRepository(Quality::class)->find($id);
        if (!$quality) {
            return new JsonResponse(['error' => 'Calidad no encontrada'], 404);
        }

        if ($quality->getProduct()?->getId() !== $product->getId()) {
            return new JsonResponse(['error' => 'La calidad no pertenece a este producto'], 404);
        }

        $em->remove($quality);
        $em->flush();

        return new JsonResponse(['message' => 'Calidad eliminada correctamente']);
    }

    #[OA\Delete(
        path: '/api/products/{productId}/formats/{id}',
        summary: 'Eliminar un formato de un producto',
        tags: ['Product Options'],
        parameters: [
            new OA\Parameter(
                name: 'productId',
                in: 'path',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
            new OA\Parameter(
                name: 'id',
                in: 'path',
                required: true,
                schema: new OA\Schema(type: 'integer')
            )
        ],
        responses: [
            new OA\Response(response: 200, description: 'Formato eliminado correctamente'),
            new OA\Response(response: 404, description: 'Producto o formato no encontrados')
        ]
    )]
    #[IsGranted('ROLE_ADMIN')]
    #[Route('/{productId}/formats/{id}', name: 'api_product_formats_delete', methods: ['DELETE'])]
    public function deleteFormat(int $productId, int $id, EntityManagerInterface $em): JsonResponse
    {
        $product = $em->getRepository(Product::class)->find($productId);
        if (!$product) {
            return new JsonResponse(['error' => 'Producto no encontrado'], 404);
        }

        $format = $em->getRepository(Format::class)->find($id);
        if (!$format) {
            return new JsonResponse(['error' => 'Formato no encontrado'], 404);
        }

        if ($format->getProduct()?->getId() !== $product->getId()) {
            return new JsonResponse(['error' => 'El formato no pertenece a este producto'], 404);
        }

        $em->remove($format);
        $em->flush();

        return new JsonResponse(['message' => 'Formato eliminado correctamente']);
    }
}
