import { IsEmail, IsNotEmpty, IsString, MinLength } from "class-validator";

export class LoginDto {
    @IsEmail({}, { message: 'Invalid email format' })
    @IsNotEmpty({ message: 'Email is required.' })
    email: string;

    @IsString()
    @MinLength(6, { message: 'Password must be at least 6 characters long.' })
    password: string;
}