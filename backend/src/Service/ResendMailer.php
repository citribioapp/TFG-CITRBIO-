<?php

namespace App\Service;

use Psr\Log\LoggerInterface;
use Symfony\Contracts\HttpClient\HttpClientInterface;

/**
 * Sends transactional emails via the Resend API.
 *
 * If RESEND_API_KEY is empty or missing, email sending is skipped and a
 * warning is logged — the application continues to work normally.
 */
class ResendMailer
{
    public function __construct(
        private readonly HttpClientInterface $httpClient,
        private readonly ?string $resendApiKey,
        private readonly string $mailerFrom,
        private readonly LoggerInterface $logger,
    ) {
    }

    /**
     * Send a transactional email.
     *
     * @param string[] $to       Recipient email addresses
     * @param string   $subject  Email subject
     * @param string   $html     HTML body
     * @param string|null $text  Optional plain-text body
     *
     * @throws \RuntimeException if the API call fails (only when key is configured)
     */
    public function send(array $to, string $subject, string $html, ?string $text = null): void
    {
        if (empty($this->resendApiKey)) {
            $this->logger->warning('RESEND_API_KEY is not configured — email skipped.', [
                'subject' => $subject,
                'to' => $to,
            ]);
            return;
        }

        $recipients = array_values(array_filter(array_map('trim', $to)));

        if ($recipients === []) {
            throw new \RuntimeException('No valid recipients provided for email.');
        }

        $payload = [
            'from' => $this->mailerFrom,
            'to' => $recipients,
            'subject' => $subject,
            'html' => $html,
        ];

        if ($text !== null && $text !== '') {
            $payload['text'] = $text;
        }

        $response = $this->httpClient->request('POST', 'https://api.resend.com/emails', [
            'headers' => [
                'Authorization' => 'Bearer ' . $this->resendApiKey,
                'Content-Type' => 'application/json',
            ],
            'json' => $payload,
            'timeout' => 20,
        ]);

        $statusCode = $response->getStatusCode();

        if ($statusCode >= 400) {
            $body = $response->getContent(false);
            $this->logger->error('Resend API returned an error.', [
                'statusCode' => $statusCode,
                'response' => $body,
                'subject' => $subject,
            ]);
            throw new \RuntimeException('Resend returned HTTP ' . $statusCode . ': ' . $body);
        }

        $this->logger->info('Email sent via Resend.', [
            'to' => $recipients,
            'subject' => $subject,
        ]);
    }
}
