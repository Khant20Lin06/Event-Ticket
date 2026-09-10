import { IsString, IsNotEmpty, IsOptional, IsNumber, IsDateString } from 'class-validator';

export class CreateEventDto {
    @IsString()
    @IsNotEmpty()
    title: string;

    @IsString()
    @IsNotEmpty()
    description: string;

    @IsString()
    @IsNotEmpty()
    venue: string;

    @IsDateString()
    @IsNotEmpty()
    eventDate: string;

    @IsNumber()
    @IsOptional()
    totalSeats?: number;

    @IsString()
    @IsOptional()
    videoTeaserUrl?: string;

    @IsString()
    @IsOptional()
    themeColor?: string;

    @IsString()
    @IsOptional()
    imageUrl?: string;

    @IsString()
    @IsOptional()
    category?: string;
}