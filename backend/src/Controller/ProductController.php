<?php

namespace App\Controller;

use App\Entity\Category;
use App\Entity\Product;
use Doctrine\ORM\EntityManagerInterface;
use OpenApi\Attributes as OA;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/products')]
class ProductController extends AbstractController
{
    #[OA\Get(
        path: "/api/products",
        summary: "Listar productos activos con búsqueda y filtros opcionales",
        tags: ["Products"],
        parameters: [
            new OA\Parameter(
                name: "search",
                in: "query",
                required: false,
                schema: new OA\Schema(type: "string"),
                description: "Buscar por nombre de producto"
            ),
            new OA\Parameter(
                name: "category",
                in: "query",
                required: false,
                schema: new OA\Schema(type: "integer"),
                description: "Filtrar por ID de categoría"
            ),
            new OA\Parameter(
                name: "isActive",
                in: "query",
                required: false,
                schema: new OA\Schema(type: "string", enum: ["true", "false"]),
                description: "Filtrar por estado activo/inactivo"
            )
        ],
        responses: [
            new OA\Response(response: 200, description: "Lista de productos")
        ]
    )]
    #[Route('', name: 'api_products_list', methods: ['GET'])]
    public function list(Request $request, EntityManagerInterface $em): JsonResponse
    {
        $qb = $em->getRepository(Product::class)->createQueryBuilder('p');

        // Default: only active products
        $isActiveParam = $request->query->get('isActive');
        if ($isActiveParam === 'false') {
            $qb->andWhere('p.isActive = :isActive')->setParameter('isActive', false);
        } elseif ($isActiveParam === null || $isActiveParam === 'true') {
            $qb->andWhere('p.isActive = :isActive')->setParameter('isActive', true);
        }

        // Search by name
        $search = $request->query->get('search');
        if ($search && trim($search) !== '') {
            $qb->andWhere('p.name LIKE :search')
               ->setParameter('search', '%' . trim($search) . '%');
        }

        // Filter by category
        $categoryId = $request->query->get('category');
        if ($categoryId && is_numeric($categoryId)) {
            $qb->andWhere('p.category = :categoryId')
               ->setParameter('categoryId', (int) $categoryId);
        }

        $qb->orderBy('p.id', 'DESC');
        $products = $qb->getQuery()->getResult();

        $data = [];

        foreach ($products as $product) {
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

            $data[] = [
                'id' => $product->getId(),
                'name' => $product->getName(),
                'description' => $product->getDescription(),
                'isActive' => $product->isActive(),
                'isOutOfSeason' => $product->isOutOfSeason(),
                'image' => $mainImage,
                'category' => $product->getCategory() ? [
                    'id' => $product->getCategory()?->getId(),
                    'name' => $product->getCategory()?->getName(),
                    'slug' => $product->getCategory()?->getSlug(),
                ] : null,
            ];
        }

        return $this->json($data);
    }

    #[OA\Get(
        path: "/api/products/{id}",
        summary: "Detalle de un producto con sus opciones",
        tags: ["Products"],
        parameters: [
            new OA\Parameter(
                name: "id",
                in: "path",
                required: true,
                schema: new OA\Schema(type: "integer")
            )
        ],
        responses: [
            new OA\Response(response: 200, description: "Detalle del producto"),
            new OA\Response(response: 404, description: "Producto no encontrado")
        ]
    )]
    #[Route('/{id}', name: 'api_products_show', methods: ['GET'])]
    public function show(int $id, EntityManagerInterface $em): JsonResponse
    {
        $product = $em->getRepository(Product::class)->find($id);

        if (!$product || !$product->isActive()) {
            return new JsonResponse([
                'error' => 'Producto no encontrado'
            ], 404);
        }

        $images = [];
        foreach ($product->getImages() as $image) {
            $images[] = [
                'id' => $image->getId(),
                'imagePath' => $image->getImagePath(),
                'isMain' => $image->isMain(),
            ];
        }

        $calibers = [];
        foreach ($product->getCalibers() as $caliber) {
            $calibers[] = [
                'id' => $caliber->getId(),
                'name' => $caliber->getName(),
            ];
        }

        $qualities = [];
        foreach ($product->getQualities() as $quality) {
            $qualities[] = [
                'id' => $quality->getId(),
                'name' => $quality->getName(),
            ];
        }

        $formats = [];
        foreach ($product->getFormats() as $format) {
            $formats[] = [
                'id' => $format->getId(),
                'name' => $format->getName(),
            ];
        }

        return $this->json([
            'id' => $product->getId(),
            'name' => $product->getName(),
            'description' => $product->getDescription(),
            'isActive' => $product->isActive(),
            'isOutOfSeason' => $product->isOutOfSeason(),
            'category' => $product->getCategory() ? [
                'id' => $product->getCategory()?->getId(),
                'name' => $product->getCategory()?->getName(),
                'slug' => $product->getCategory()?->getSlug(),
            ] : null,
            'images' => $images,
            'options' => [
                'calibers' => $calibers,
                'qualities' => $qualities,
                'formats' => $formats,
            ],
        ]);
    }

    #[OA\Post(
        path: "/api/products",
        summary: "Crear un nuevo producto",
        tags: ["Products"],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ["name", "categoryId"],
                properties: [
                    new OA\Property(property: "name", type: "string", example: "Navelina"),
                    new OA\Property(property: "categoryId", type: "integer", example: 1),
                    new OA\Property(property: "description", type: "string", example: "Naranja dulce de Valencia"),
                    new OA\Property(property: "isActive", type: "boolean", example: true)
                ]
            )
        ),
        responses: [
            new OA\Response(response: 201, description: "Producto creado"),
            new OA\Response(response: 400, description: "Error de validación")
        ]
    )]
    #[IsGranted('ROLE_ADMIN')]
    #[Route('', name: 'api_products_create', methods: ['POST'])]
    public function create(Request $request, EntityManagerInterface $em): JsonResponse
    {
        $data = json_decode($request->getContent(), true);

        if (!isset($data['name']) || trim($data['name']) === '') {
            return new JsonResponse([
                'error' => 'El nombre es obligatorio'
            ], 400);
        }

        if (!isset($data['categoryId'])) {
            return new JsonResponse([
                'error' => 'La categoría es obligatoria'
            ], 400);
        }

        $category = $em->getRepository(Category::class)->find((int) $data['categoryId']);

        if (!$category || !$category->isActive()) {
            return new JsonResponse([
                'error' => 'Categoría no encontrada'
            ], 404);
        }

        $product = new Product();
        $product->setName(trim($data['name']));
        $product->setCategory($category);
        $product->setDescription($data['description'] ?? null);
        $product->setIsActive($data['isActive'] ?? true);
        $product->setIsOutOfSeason($data['isOutOfSeason'] ?? false);

        $em->persist($product);
        $em->flush();

        return new JsonResponse([
            'message' => 'Producto creado correctamente',
            'id' => $product->getId(),
            'name' => $product->getName(),
            'categoryId' => $product->getCategory()?->getId(),
            'description' => $product->getDescription(),
            'isActive' => $product->isActive(),
            'isOutOfSeason' => $product->isOutOfSeason(),
        ], 201);
    }

    #[OA\Put(
        path: "/api/products/{id}",
        summary: "Actualizar producto",
        tags: ["Products"],
        parameters: [
            new OA\Parameter(
                name: "id",
                in: "path",
                required: true,
                schema: new OA\Schema(type: "integer")
            )
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: "name", type: "string", example: "Lane Late"),
                    new OA\Property(property: "categoryId", type: "integer", example: 1),
                    new OA\Property(property: "description", type: "string", example: "Naranja dulce de Valencia"),
                    new OA\Property(property: "isActive", type: "boolean", example: true)
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: "Producto actualizado"),
            new OA\Response(response: 404, description: "Producto no encontrado")
        ]
    )]
    #[IsGranted('ROLE_ADMIN')]
    #[Route('/{id}', name: 'api_products_update', methods: ['PUT'])]
    public function update(int $id, Request $request, EntityManagerInterface $em): JsonResponse
    {
        $product = $em->getRepository(Product::class)->find($id);

        if (!$product) {
            return new JsonResponse([
                'error' => 'Producto no encontrado'
            ], 404);
        }

        $data = json_decode($request->getContent(), true);

        if (isset($data['name']) && trim($data['name']) !== '') {
            $product->setName(trim($data['name']));
        }

        if (isset($data['categoryId'])) {
            $category = $em->getRepository(Category::class)->find((int) $data['categoryId']);

            if (!$category || !$category->isActive()) {
                return new JsonResponse([
                    'error' => 'Categoría no encontrada'
                ], 404);
            }

            $product->setCategory($category);
        }

        if (array_key_exists('description', $data)) {
            $product->setDescription($data['description']);
        }

        if (isset($data['isActive'])) {
            $product->setIsActive($data['isActive']);
        }

        if (array_key_exists('isOutOfSeason', $data)) {
            $product->setIsOutOfSeason((bool) $data['isOutOfSeason']);
        }

        $em->flush();

        return new JsonResponse([
            'message' => 'Producto actualizado correctamente',
            'id' => $product->getId(),
            'name' => $product->getName(),
            'categoryId' => $product->getCategory()?->getId(),
            'description' => $product->getDescription(),
            'isActive' => $product->isActive(),
            'isOutOfSeason' => $product->isOutOfSeason(),
        ]);
    }

    #[OA\Delete(
        path: "/api/products/{id}",
        summary: "Eliminar producto",
        tags: ["Products"],
        parameters: [
            new OA\Parameter(
                name: "id",
                in: "path",
                required: true,
                schema: new OA\Schema(type: "integer")
            )
        ],
        responses: [
            new OA\Response(response: 200, description: "Producto eliminado"),
            new OA\Response(response: 404, description: "Producto no encontrado")
        ]
    )]
    #[IsGranted('ROLE_ADMIN')]
    #[Route('/{id}', name: 'api_products_delete', methods: ['DELETE'])]
    public function delete(int $id, EntityManagerInterface $em): JsonResponse
    {
        $product = $em->getRepository(Product::class)->find($id);

        if (!$product) {
            return new JsonResponse([
                'error' => 'Producto no encontrado'
            ], 404);
        }

        $em->remove($product);
        $em->flush();

        return new JsonResponse([
            'message' => 'Producto eliminado correctamente'
        ]);
    }
}
