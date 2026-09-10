import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User, UserRole } from './entities/user.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>
    ) { }

    async findAll(): Promise<User[]> {
        return this.userRepository.find({
            order: {
                createdAt: 'ASC'
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true,
                updatedAt: true
            }
        });
    }

    async findOne(id: string): Promise<User> {
        const user = await this.userRepository.findOne({
            where: { id },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true,
                updatedAt: true
            }
        });

        if (!user) {
            throw new NotFoundException(`User with ID ${id} not found`);
        }

        return user;
    }

    async createUser(name: string, email: string, password = 'password123', role = UserRole.FAN):
        Promise<User> {
        const existing = await this.userRepository.findOne({
            where: { email }
        });
        if (existing) {
            throw new ConflictException(`User with email ${email} already exists`);
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = this.userRepository.create({
            name,
            email,
            passwordHash: hashedPassword,
            role,
        });

        const saved = await this.userRepository.save(user);
        delete (saved as any).passwordHash;
        return saved;
    }



    async findByEmailWithPassword(email: string): Promise<User | null> {
        return this.userRepository.findOne({
            where: { email }
        });
    }
}
