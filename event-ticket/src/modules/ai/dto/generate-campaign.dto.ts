import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class GenerateCampaignDto {
    @IsString()
    @IsNotEmpty()
    prompt: string;

    @IsString()
    @IsOptional()
    genre?: string;

    @IsString()
    @IsOptional()
    venue?: string;

    @IsString()
    @IsOptional()
    artist?: string;
}

export class GenerateMotionPassDto {
    @IsString()
    @IsNotEmpty()
    seatNumber: string;

    @IsString()
    @IsNotEmpty()
    tier: string;

    @IsString()
    @IsNotEmpty()
    eventTitle: string;
}
