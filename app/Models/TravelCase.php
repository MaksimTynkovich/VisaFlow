<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class TravelCase extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $fillable = [
        'user_id',
        'created_by',
        'visa_type_id',
        'form_template_id',
        'public_token',
        'bitrix_deal_id',
        'bitrix_product_snapshot',
        'status',
        'filled_at',
    ];

    protected $casts = [
        'bitrix_product_snapshot' => 'array',
        'filled_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    public function visaType(): BelongsTo
    {
        return $this->belongsTo(VisaType::class);
    }

    public function formTemplate(): BelongsTo
    {
        return $this->belongsTo(FormTemplate::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function formResponses()
    {
        return $this->hasMany(FormResponse::class);
    }

    public function formDrafts()
    {
        return $this->hasMany(FormDraft::class);
    }
}


