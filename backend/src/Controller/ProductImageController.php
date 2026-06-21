<?php

namespace App\Controller;

use App\Entity\Product;
use App\Entity\ProductImage;
use Doctrine\ORM\EntityManagerInterface;
use Throwable;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use OpenApi\Attributes as OA;

#[Route('/api')]
class ProductImageController extends AbstractController
{
    #[OA\Get(
        path: "/api/products/{id}/images",
        summary: "Listar imágenes de un producto",
        tags: ["Product Images"],
        parameters: [
            new OA\Parameter(
                name: "id",
                in: "path",
                required: true,
                schema: new OA\Schema(type: "integer")
            )
        ],
        responses: [
            new OA\Response(response: 200, description: "Lista de imágenes"),
            new OA\Response(response: 404, description: "Producto no encontrado")
        ]
    )]
    #[Route('/products/{id}/images', name: 'api_product_images_list', methods: ['GET'])]
    public function listByProduct(int $id, EntityManagerInterface $em): JsonResponse
    {
        $product = $em->getRepository(Product::class)->find($id);

        if (!$product) {
            return new JsonResponse([
                'error' => 'Producto no encontrado'
            ], 404);
        }

        $images = $em->getRepository(ProductImage::class)->findBy([
            'product' => $product
        ]);

        $data = [];

        foreach ($images as $image) {
            $data[] = [
                'id' => $image->getId(),
                'imagePath' => $image->getImagePath(),
                'isMain' => $image->isMain(),
                'createdAt' => $image->getCreatedAt()?->format('Y-m-d H:i:s')
            ];
        }

        return $this->json($data);
    }

    #[OA\Post(
        path: "/api/products/{id}/images",
        summary: "Subir imagen a un producto",
        tags: ["Product Images"],
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
            content: new OA\MediaType(
                mediaType: "multipart/form-data",
                schema: new OA\Schema(
                    required: ["image"],
                    properties: [
                        new OA\Property(
                            property: "image",
                            type: "string",
                            format: "binary"
                        )
                    ]
                )
            )
        ),
        responses: [
            new OA\Response(response: 201, description: "Imagen subida correctamente"),
            new OA\Response(response: 400, description: "Archivo inválido o no enviado"),
            new OA\Response(response: 404, description: "Producto no encontrado")
        ]
    )]
    #[IsGranted('ROLE_ADMIN')]
    #[Route('/products/{id}/images', name: 'api_product_upload_image', methods: ['POST'])]
    public function uploadImage(
        int $id,
        Request $request,
        EntityManagerInterface $em
    ): JsonResponse {
        $product = $em->getRepository(Product::class)->find($id);

        if (!$product) {
            return new JsonResponse([
                'error' => 'Producto no encontrado'
            ], 404);
        }

        $file = $request->files->get('image');

        if (!$file) {
            return new JsonResponse([
                'error' => 'No se ha enviado ninguna imagen'
            ], 400);
        }

        $uploadPath = $this->getParameter('kernel.project_dir') . '/public/uploads/products';
        $extension = $file->guessExtension() ?: 'bin';
        $filename = uniqid('', true) . '.' . $extension;

        if (!is_dir($uploadPath) && !mkdir($uploadPath, 0775, true) && !is_dir($uploadPath)) {
            return new JsonResponse([
                'error' => 'No se pudo preparar la carpeta de subida de imágenes'
            ], 500);
        }

        try {
            $file->move($uploadPath, $filename);

            $image = new ProductImage();
            $image->setImagePath('/uploads/products/' . $filename);
            $image->setIsMain($product->getImages()->count() === 0);
            $image->setCreatedAt(new \DateTimeImmutable());
            $image->setProduct($product);

            $em->persist($image);
            $em->flush();
        } catch (Throwable $exception) {
            return new JsonResponse([
                'error' => 'No se pudo guardar la imagen del producto'
            ], 500);
        }

        return new JsonResponse([
            'message' => 'Imagen subida correctamente'
        ], 201);
    }

    #[OA\Delete(
        path: "/api/product-images/{id}",
        summary: "Eliminar imagen de producto",
        tags: ["Product Images"],
        parameters: [
            new OA\Parameter(
                name: "id",
                in: "path",
                required: true,
                schema: new OA\Schema(type: "integer")
            )
        ],
        responses: [
            new OA\Response(response: 200, description: "Imagen eliminada"),
            new OA\Response(response: 404, description: "Imagen no encontrada")
        ]
    )]
    #[IsGranted('ROLE_ADMIN')]
    #[Route('/product-images/{id}', name: 'api_product_image_delete', methods: ['DELETE'])]
    public function delete(int $id, EntityManagerInterface $em): JsonResponse
    {
        $image = $em->getRepository(ProductImage::class)->find($id);

        if (!$image) {
            return new JsonResponse([
                'error' => 'Imagen no encontrada'
            ], 404);
        }

        $absolutePath = $this->getParameter('kernel.project_dir') . '/public' . $image->getImagePath();

        if (file_exists($absolutePath)) {
            unlink($absolutePath);
        }

        $em->remove($image);
        $em->flush();

        return new JsonResponse([
            'message' => 'Imagen eliminada correctamente'
        ]);
    }
}
