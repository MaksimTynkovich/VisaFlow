<?php

namespace App\Exceptions;

use Exception;

class NotAdminException extends Exception
{
    public function __construct(string $message = 'Not an admin')
    {
        parent::__construct($message, 403);
    }
}

