import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { User } from '../users/entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
    constructor(
        private readonly userService: UsersService,
        private readonly jwtService: JwtService,
    ) { }

    async register(dto: RegisterDto): Promise<{ access_token: string; user: Omit<User, 'passwordHash'> }> {
        const user = await this.userService.createUser(dto.name, dto.email, dto.password);
        const payload = { email: user.email, sub: user.id, role: user.role };
        return {
            access_token: this.jwtService.sign(payload),
            user,
        };
    }

    async validateUser(email: string, pass: string): Promise<User> {
        const user = await this.userService.findByEmailWithPassword(email);
        if (user && (await bcrypt.compare(pass, user.passwordHash))) {
            const { passwordHash, ...result } = user as any;
            return result;
        }
        throw new UnauthorizedException('Invalid email or password');
    }

    async login(loginDto: LoginDto): Promise<{ access_token: string; user: Omit<User, 'passwordHash'> }> {
        const user = await this.validateUser(loginDto.email, loginDto.password);
        const payload = { email: user.email, sub: user.id, role: user.role };

        return {
            access_token: this.jwtService.sign(payload),
            user,
        }
    }
}
