<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FormFile extends Model
{
    use HasFactory;

    protected $fillable = [
        'form_response_id',
        'field_id',
        'original_name',
        'file_path',
        'mime_type',
        'file_size',
    ];

    protected $casts = [
        'file_size' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function formResponse(): BelongsTo
    {
        return $this->belongsTo(FormResponse::class);
    }
}
