<?php

namespace App\Controller;

use App\Entity\Category;
use Doctrine\ORM\EntityManagerInterface;
use OpenApi\Attributes as OA;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/categories')]
class CategoryController extends AbstractController
{
    #[OA\Get(
        path: '/api/categories',
        summary: 'Listar categorías activas con sus productos',
        tags: ['Categories'],
        responses: [
            new OA\Response(response: 200, description: 'Lista de categorías')
        ]
    )]
    #[Route('', name: 'api_categories_list', methods: ['GET'])]
    public function list(EntityManagerInterface $em): JsonResponse
    {
        $categories = $em->getRepository(Category::class)->findBy(
            ['isActive' => true],
            ['name' => 'ASC']
        );

        $data = [];

        foreach ($categories as $category) {
            $products = [];

            foreach ($category->getProducts() as $product) {
                if (!$product->isActive()) {
                    continue;
                }

                $mainImage = null;

                foreach ($product->getImages() as $image) {
                    if ($image->isMain()) {
                        $mainImage = $image->getImagePath();
                        break;
                    }
                }

                if (!$mainImage && $product->getImages()->count() > 0) {
                    $mainImage = $product->getImages()->first()->getImagePath();
                }

                $products[] = [
                    'id' => $product->getId(),
                    'name' => $product->getName(),
                    'description' => $product->getDescription(),
                    'image' => $mainImage,
                    'isOutOfSeason' => $product->isOutOfSeason(),
                ];
            }

            $data[] = [
                'id' => $category->getId(),
                'name' => $category->getName(),
                'slug' => $category->getSlug(),
                'description' => $category->getDescription(),
                'products' => $products,
            ];
        }

        return $this->json($data);
    }

    #[OA\Post(
        path: '/api/categories',
        summary: 'Crear una categoría',
        tags: ['Categories'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['name'],
                properties: [
                    new OA\Property(property: 'name', type: 'string', example: 'Naranjas'),
                    new OA\Property(property: 'slug', type: 'string', example: 'naranjas'),
                    new OA\Property(property: 'description', type: 'string', example: 'Productos de la categoría naranjas'),
                    new OA\Property(property: 'isActive', type: 'boolean', example: true)
                ]
            )
        ),
        responses: [
            new OA\Response(response: 201, description: 'Categoría creada correctamente'),
            new OA\Response(response: 400, description: 'Datos inválidos')
        ]
    )]
    #[IsGranted('ROLE_ADMIN')]
    #[Route('', name: 'api_categories_create', methods: ['POST'])]
    public function create(Request $request, EntityManagerInterface $em): JsonResponse
    {
        $data = json_decode($request->getContent(), true);

        if (!isset($data['name']) || trim((string) $data['name']) === '') {
            return new JsonResponse(['error' => 'El nombre es obligatorio'], 400);
        }

        $name = trim((string) $data['name']);
        $slug = $this->slugify($data['slug'] ?? $name);

        $existing = $em->getRepository(Category::class)->findOneBy(['slug' => $slug]);
        if ($existing) {
            return new JsonResponse(['error' => 'Ya existe una categoría con ese slug'], 400);
        }

        $category = new Category();
        $category->setName($name);
        $category->setSlug($slug);
        $category->setDescription($data['description'] ?? null);
        $category->setIsActive($data['isActive'] ?? true);

        $em->persist($category);
        $em->flush();

        return new JsonResponse([
            'message' => 'Categoría creada correctamente',
            'id' => $category->getId(),
            'name' => $category->getName(),
            'slug' => $category->getSlug(),
        ], 201);
    }

    #[OA\Get(
        path: '/api/categories/{id}/products',
        summary: 'Listar productos de una categoría',
        tags: ['Categories'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                required: true,
                schema: new OA\Schema(type: 'integer')
            )
        ],
        responses: [
            new OA\Response(response: 200, description: 'Productos de la categoría'),
            new OA\Response(response: 404, description: 'Categoría no encontrada')
        ]
    )]
    #[Route('/{id}/products', name: 'api_categories_products', methods: ['GET'])]
    public function products(int $id, EntityManagerInterface $em): JsonResponse
    {
        $category = $em->getRepository(Category::class)->find($id);

        if (!$category || !$category->isActive()) {
            return new JsonResponse(['error' => 'Categoría no encontrada'], 404);
        }

        $products = [];

        foreach ($category->getProducts() as $product) {
            if (!$product->isActive()) {
                continue;
            }

            $mainImage = null;
            foreach ($product->getImages() as $image) {
                if ($image->isMain()) {
                    $mainImage = $image->getImagePath();
                    break;
                }
            }
            if (!$mainImage && $product->getImages()->count() > 0) {
                $mainImage = $product->getImages()->first()->getImagePath();
            }

            $products[] = [
                'id' => $product->getId(),
                'name' => $product->getName(),
                'description' => $product->getDescription(),
                'image' => $mainImage,
                'isOutOfSeason' => $product->isOutOfSeason(),
            ];
        }

        return $this->json([
            'category' => [
                'id' => $category->getId(),
                'name' => $category->getName(),
                'slug' => $category->getSlug(),
            ],
            'products' => $products,
        ]);
    }

    #[OA\Put(
        path: '/api/categories/{id}',
        summary: 'Actualizar una categoría',
        tags: ['Categories'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'name', type: 'string', example: 'Naranjas'),
                    new OA\Property(property: 'description', type: 'string', example: 'Naranjas de origen mediterráneo'),
                    new OA\Property(property: 'isActive', type: 'boolean', example: true)
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Categoría actualizada correctamente'),
            new OA\Response(response: 400, description: 'Datos inválidos'),
            new OA\Response(response: 404, description: 'Categoría no encontrada')
        ]
    )]
    #[IsGranted('ROLE_ADMIN')]
    #[Route('/{id}', name: 'api_categories_update', methods: ['PUT'])]
    public function update(int $id, Request $request, EntityManagerInterface $em): JsonResponse
    {
        $category = $em->getRepository(Category::class)->find($id);

        if (!$category) {
            return new JsonResponse(['error' => 'Categoría no encontrada'], 404);
        }

        $data = json_decode($request->getContent(), true);

        if (!is_array($data)) {
            return new JsonResponse(['error' => 'JSON inválido'], 400);
        }

        if (array_key_exists('name', $data)) {
            $name = trim((string) $data['name']);

            if ($name === '') {
                return new JsonResponse(['error' => 'El nombre no puede estar vacío'], 400);
            }

            // Check uniqueness only if the name actually changed
            if ($name !== $category->getName()) {
                $existing = $em->getRepository(Category::class)->findOneBy(['name' => $name]);
                if ($existing) {
                    return new JsonResponse(['error' => 'Ya existe una categoría con ese nombre'], 400);
                }
            }

            $category->setName($name);
        }

        if (array_key_exists('description', $data)) {
            $category->setDescription($data['description'] !== null ? trim((string) $data['description']) : null);
        }

        if (array_key_exists('isActive', $data)) {
            $category->setIsActive((bool) $data['isActive']);
        }

        $em->flush();

        return new JsonResponse([
            'message' => 'Categoría actualizada correctamente',
            'id' => $category->getId(),
            'name' => $category->getName(),
            'slug' => $category->getSlug(),
            'description' => $category->getDescription(),
            'isActive' => $category->isActive(),
        ]);
    }

    #[OA\Delete(
        path: '/api/categories/{id}',
        summary: 'Eliminar una categoría y todos sus productos',
        tags: ['Categories'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        responses: [
            new OA\Response(response: 200, description: 'Categoría eliminada'),
            new OA\Response(response: 404, description: 'Categoría no encontrada')
        ]
    )]
    #[IsGranted('ROLE_ADMIN')]
    #[Route('/{id}', name: 'api_categories_delete', methods: ['DELETE'])]
    public function delete(int $id, EntityManagerInterface $em): JsonResponse
    {
        $category = $em->getRepository(Category::class)->find($id);

        if (!$category) {
            return new JsonResponse(['error' => 'Categoría no encontrada'], 404);
        }

        // Explicitly remove each product so Doctrine cascades orphanRemoval
        // on calibers, qualities and formats. ProductImage uses onDelete: CASCADE
        // at DB level, so those are handled by the database automatically.
        foreach ($category->getProducts() as $product) {
            $em->remove($product);
        }

        $em->remove($category);
        $em->flush();

        return new JsonResponse(['message' => 'Categoría eliminada correctamente']);
    }

    private function slugify(string $value): string
    {
        $value = trim(mb_strtolower($value));
        $value = preg_replace('/[^a-z0-9]+/i', '-', $value) ?? '';

        return trim($value, '-') ?: 'categoria';
    }
}
