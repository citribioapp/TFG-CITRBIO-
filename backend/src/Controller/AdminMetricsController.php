<?php

namespace App\Controller;

use App\Entity\Category;
use App\Entity\CustomerOrder;
use App\Entity\Product;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use OpenApi\Attributes as OA;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

class AdminMetricsController extends AbstractController
{
    #[OA\Get(
        path: '/api/admin/metrics',
        summary: 'Obtener métricas del dashboard administrativo',
        tags: ['Admin'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Métricas del sistema'
            )
        ]
    )]
    #[IsGranted('ROLE_ADMIN')]
    #[Route('/api/admin/metrics', name: 'api_admin_metrics', methods: ['GET'])]
    public function getMetrics(EntityManagerInterface $em): JsonResponse
    {
        $userRepository = $em->getRepository(User::class);
        $productRepository = $em->getRepository(Product::class);
        $categoryRepository = $em->getRepository(Category::class);
        $orderRepository = $em->getRepository(CustomerOrder::class);

        $totalUsers = $userRepository->count([]);
        $totalProducts = $productRepository->count([]);
        $totalCategories = $categoryRepository->count([]);
        $totalOrders = $orderRepository->count([]);

        // Count orders by status
        $ordersByStatus = [];
        $statuses = ['under_review', 'quote_sent', 'payment_received', 'shipped', 'confirmed'];

        foreach ($statuses as $status) {
            $count = $orderRepository->count(['status' => $status]);
            if ($count > 0) {
                $ordersByStatus[$status] = $count;
            }
        }

        return $this->json([
            'totalUsers' => $totalUsers,
            'totalProducts' => $totalProducts,
            'totalCategories' => $totalCategories,
            'totalOrders' => $totalOrders,
            'ordersByStatus' => $ordersByStatus,
        ]);
    }
}
