<?php

namespace App\Controller;

use App\Entity\Cart;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use OpenApi\Attributes as OA;

#[Route('/api')]
#[IsGranted('ROLE_ADMIN')]
class UserController extends AbstractController
{
    #[OA\Get(
        path: "/api/users",
        summary: "Listar usuarios",
        tags: ["Users"]
    )]
    #[Route('/users', methods: ['GET'])]
    public function list(EntityManagerInterface $em): JsonResponse
    {
        $users = $em->getRepository(User::class)->findAll();

        $data = [];

        foreach ($users as $user) {
            $data[] = [
                'id' => $user->getId(),
                'name' => $user->getName(),
                'lastName' => $user->getLastName(),
                'dni' => $user->getDni(),
                'email' => $user->getEmail(),
                'phone' => $user->getPhone(),
                'deliveryAddress' => $user->getDeliveryAddress(),
                'roles' => $user->getRoles(),
                'createdAt' => $user->getCreatedAt()?->format('Y-m-d H:i:s')
            ];
        }

        return $this->json($data);
    }

    #[OA\Get(
        path: "/api/users/{id}",
        summary: "Ver usuario",
        tags: ["Users"]
    )]
    #[Route('/users/{id}', methods: ['GET'])]
    public function show(int $id, EntityManagerInterface $em): JsonResponse
    {
        $user = $em->getRepository(User::class)->find($id);

        if (!$user) {
            return $this->json([
                'error' => 'Usuario no encontrado'
            ], 404);
        }

        return $this->json([
            'id' => $user->getId(),
            'name' => $user->getName(),
            'lastName' => $user->getLastName(),
            'dni' => $user->getDni(),
            'email' => $user->getEmail(),
            'phone' => $user->getPhone(),
            'deliveryAddress' => $user->getDeliveryAddress(),
            'roles' => $user->getRoles(),
            'createdAt' => $user->getCreatedAt()?->format('Y-m-d H:i:s')
        ]);
    }

    #[OA\Patch(
        path: "/api/users/{id}/roles",
        summary: "Actualizar roles de un usuario",
        tags: ["Users"],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ["roles"],
                properties: [
                    new OA\Property(
                        property: "roles",
                        type: "array",
                        items: new OA\Items(type: "string"),
                        example: ["ROLE_USER"]
                    )
                ]
            )
        )
    )]
    #[Route('/users/{id}/roles', methods: ['PATCH'])]
    public function updateRoles(
        int $id,
        Request $request,
        EntityManagerInterface $em
    ): JsonResponse {
        $user = $em->getRepository(User::class)->find($id);

        if (!$user) {
            return $this->json([
                'error' => 'Usuario no encontrado'
            ], 404);
        }

        $data = json_decode($request->getContent(), true);

        if (!isset($data['roles']) || !is_array($data['roles'])) {
            return $this->json([
                'error' => 'El campo roles es obligatorio y debe ser un array'
            ], 400);
        }

        $allowedRoles = ['ROLE_USER', 'ROLE_ADMIN'];
        $roles = array_values(array_unique($data['roles']));

        foreach ($roles as $role) {
            if (!in_array($role, $allowedRoles, true)) {
                return $this->json([
                    'error' => 'Rol no permitido: ' . $role
                ], 400);
            }
        }

        if (empty($roles)) {
            $roles = ['ROLE_USER'];
        }

        $user->setRoles($roles);

        $em->flush();

        return $this->json([
            'message' => 'Roles actualizados correctamente',
            'roles' => $user->getRoles()
        ]);
    }

    #[OA\Delete(
        path: "/api/users/{id}",
        summary: "Eliminar usuario",
        tags: ["Users"]
    )]
    #[Route('/users/{id}', methods: ['DELETE'])]
    public function delete(int $id, EntityManagerInterface $em): JsonResponse
    {
        $user = $em->getRepository(User::class)->find($id);

        if (!$user) {
            return $this->json([
                'error' => 'Usuario no encontrado'
            ], 404);
        }

        if ($user === $this->getUser()) {
            return $this->json([
                'error' => 'No puedes eliminar tu propio usuario'
            ], 400);
        }

        if ($user->getOrders()->count() > 0) {
            return $this->json([
                'error' => 'No se puede eliminar un usuario que tiene pedidos registrados'
            ], 400);
        }

        $carts = $em->getRepository(Cart::class)->findBy(['user' => $user]);

        foreach ($carts as $cart) {
            foreach ($cart->getItems() as $item) {
                $em->remove($item);
            }

            $em->remove($cart);
        }

        $em->remove($user);
        $em->flush();

        return $this->json([
            'message' => 'Usuario eliminado'
        ]);
    }
}
