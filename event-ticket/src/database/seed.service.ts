import { Injectable, OnApplicationBootstrap, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import Redis from 'ioredis';
import { User, UserRole } from '../modules/users/entities/user.entity';
import { Seat, SeatStatus } from '../modules/seats/entities/seat.entity';
import { Event } from '../modules/events/entities/event.entity';
import { REDIS_CLIENT } from '../modules/redis/redis-lock.service';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
    private readonly logger = new Logger(SeedService.name);

    constructor(
        @InjectRepository(Event)
        private readonly eventRepository: Repository<Event>,
        @InjectRepository(Seat)
        private readonly seatRepository: Repository<Seat>,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        @Inject(REDIS_CLIENT)
        private readonly redisClient: Redis,
    ) { }

    async onApplicationBootstrap() {
        await this.seedData();
    }

    private async seedData() {
        const sampleEvents = [
            {
                title: 'Dune: Part Two (IMAX 3D Laser)',
                category: 'IMAX_3D',
                venue: 'IMAX Laser Auditorium 1',
                imageUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1200&q=80',
                description: 'Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family. Projected on an 8-story IMAX Laser screen.',
            },
            {
                title: 'Oppenheimer (70mm IMAX Exclusive)',
                category: 'BLOCKBUSTER',
                venue: 'Grand 70mm Screen 2',
                imageUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1200&q=80',
                description: 'Christopher Nolan’s biographical masterpiece chronicling J. Robert Oppenheimer and the Manhattan Project in authentic 70mm analog film format.',
            },
            {
                title: 'Spider-Man: Beyond the Spider-Verse',
                category: 'ANIME_FEATURE',
                venue: 'Dolby Cinema Hall 3',
                imageUrl: 'https://images.unsplash.com/photo-1635805737707-575885ab0820?auto=format&fit=crop&w=1200&q=80',
                description: 'Miles Morales journeys through the multiverse to save the people he loves most in mind-bending animated visual brilliance with Dolby Vision HDR.',
            },
            {
                title: 'Avatar: The Way of Water (HFR 3D)',
                category: 'IMAX_3D',
                venue: 'IMAX Laser Auditorium 1',
                imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80',
                description: 'Return to Pandora with James Cameron. Jake Sully and Neytiri explore the majestic oceanic reefs in High Frame Rate (HFR) 48fps RealD 3D.',
            },
            {
                title: 'Interstellar (10th Anniversary Re-release)',
                category: 'SCIFI_FANTASY',
                venue: 'IMAX Laser Auditorium 1',
                imageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
                description: 'Special 10th-anniversary celebration screening. Journey past the edges of time and space to ensure humanity’s survival, accompanied by Hans Zimmer’s iconic organ score.',
            },
            {
                title: 'The Batman: Part II (Dolby Atmos Night)',
                category: 'DOLBY_CINEMA',
                venue: 'Dolby Cinema Hall 3',
                imageUrl: 'https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?auto=format&fit=crop&w=1200&q=80',
                description: 'Robert Pattinson returns as the Dark Knight, diving deeper into the labyrinth of Gotham’s corrupt underworld with ground-shaking Dolby Atmos sound.',
            },
            {
                title: 'Blade Runner 2049 (Special 4K Laser)',
                category: 'SCIFI_FANTASY',
                venue: "Director's Club VIP Lounge",
                imageUrl: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=1200&q=80',
                description: 'Denis Villeneuve’s visionary masterpiece featuring Roger Deakins’ Oscar-winning cinematography in ultra-high dynamic range 4K laser projection.',
            },
            {
                title: 'Demon Slayer: Infinity Castle Premiere',
                category: 'ANIME_FEATURE',
                venue: 'Starlight Screen 4 (D-Box)',
                imageUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=1200&q=80',
                description: 'The epic clash between the Demon Slayer Corps and Muzan Kibutsuji begins in the shape-shifting Infinity Castle. Exclusive advance premiere screening.',
            },
            {
                title: 'Alien: Romulus (IMAX Experience)',
                category: 'BLOCKBUSTER',
                venue: 'Grand Screen 2 (RealD 3D)',
                imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80',
                description: 'A group of young space colonizers scavenging a derelict space station come face-to-face with the most terrifying life form in the universe.',
            },
            {
                title: 'Gladiator II (Dolby Cinema Premiere)',
                category: 'DOLBY_CINEMA',
                venue: 'Dolby Cinema Hall 3',
                imageUrl: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=1200&q=80',
                description: 'Ridley Scott returns to Ancient Rome with Lucius entering the Colosseum following in the footsteps of Maximus. Experience the thunder of war in Dolby Atmos.',
            },
            {
                title: 'Top Gun: Maverick (ScreenX 270°)',
                category: 'ACTION_4DX',
                venue: 'ScreenX Panoramic Screen 5',
                imageUrl: 'https://images.unsplash.com/photo-1519074069444-1ba4eae16e60?auto=format&fit=crop&w=1200&q=80',
                description: 'Feel the Mach 10 G-forces projected across three walls simultaneously in 270-degree ScreenX technology with roaring jet engine vibrations.',
            },
            {
                title: 'Spirited Away (Ghibli 4K Restoration)',
                category: 'ANIME_FEATURE',
                venue: "Director's Club VIP Lounge",
                imageUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1200&q=80',
                description: 'Hayao Miyazaki’s Academy Award-winning fantasy masterpiece beautifully remastered in pristine 4K resolution with original Japanese dialogue & subtitles.',
            },
            {
                title: 'Inception (Director’s Cut 15th Anniv)',
                category: 'SCIFI_FANTASY',
                venue: 'Grand 70mm Screen 2',
                imageUrl: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&w=1200&q=80',
                description: 'Dom Cobb and his dream extraction team attempt an impossible subconscious heist. Celebrating 15 years of Christopher Nolan’s mind-bending epic.',
            },
            {
                title: 'John Wick: Chapter 5 - Syndicate War',
                category: 'ACTION_4DX',
                venue: 'Starlight Screen 4 (D-Box)',
                imageUrl: 'https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?auto=format&fit=crop&w=1200&q=80',
                description: 'The Baba Yaga faces the highest echelon of the High Table in heart-racing synchronized 4DX motion seats, wind, smoke, and strobe effects.',
            },
            {
                title: 'Tron: Ares (IMAX 3D Laser Launch)',
                category: 'IMAX_3D',
                venue: 'IMAX Laser Auditorium 1',
                imageUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80',
                description: 'A sophisticated program named Ares is sent from the digital world into the real world on a dangerous mission. Score by Nine Inch Nails.',
            },
            {
                title: 'A Quiet Place: Day One (Dolby Audio)',
                category: 'DOLBY_CINEMA',
                venue: 'Dolby Cinema Hall 3',
                imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80',
                description: 'Experience the day the world went quiet in New York City. Pin-drop spatial Dolby Audio makes every heartbeat and breath feel intensely intimate.',
            },
            {
                title: 'Mad Max: Furiosa (Black & Chrome)',
                category: 'ACTION_4DX',
                venue: 'Starlight Screen 4 (D-Box)',
                imageUrl: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1200&q=80',
                description: 'George Miller’s post-apocalyptic spectacle presented in stark monochrome black-and-chrome high contrast with roaring V8 engine physical seat vibrations.',
            },
            {
                title: 'Mission: Impossible - Final Reckoning',
                category: 'BLOCKBUSTER',
                venue: 'IMAX Laser Auditorium 1',
                imageUrl: 'https://images.unsplash.com/photo-1519074069444-1ba4eae16e60?auto=format&fit=crop&w=1200&q=80',
                description: 'Tom Cruise performs death-defying practical stunts as Ethan Hunt tracks down the rogue AI entity across the arctic and deep oceans.',
            },
            {
                title: 'Everything Everywhere All at Once (VIP)',
                category: 'VIP_LOUNGE',
                venue: "Director's Club VIP Lounge",
                imageUrl: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=1200&q=80',
                description: 'The multi-Oscar winning sensation experienced from luxury leather recliner seats with complimentary cinema refreshments and gourmet popcorn.',
            },
            {
                title: 'The Matrix (25th Anniv 4K Dolby Edition)',
                category: 'VIP_LOUNGE',
                venue: "Director's Club VIP Lounge",
                imageUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80',
                description: 'Keanu Reeves chooses the red pill in stunning remastered Dolby Vision HDR. Re-live the bullet-time revolution 25 years after its debut.',
            },
        ];

        // 0. Ensure Enterprise RBAC Accounts Exist
        const passwordHash = await bcrypt.hash('password123', 10);
        const enterpriseUsers = [
            { email: 'admin@aura.live', name: 'Platform Admin', passwordHash, role: UserRole.ADMIN },
            { email: 'organizer@aura.live', name: 'Cinema Manager', passwordHash, role: UserRole.ORGANIZER },
            { email: 'user1@gmail.com', name: 'Movie Fan 01', passwordHash, role: UserRole.FAN },
        ];
        for (const u of enterpriseUsers) {
            const exists = await this.userRepository.findOne({ where: { email: u.email } });
            if (!exists) {
                await this.userRepository.save(this.userRepository.create(u));
            } else if (exists.role !== u.role) {
                exists.role = u.role;
                await this.userRepository.save(exists);
            }
        }
        this.logger.log('👥 Synced cinema management accounts (admin@aura.live, organizer@aura.live, user1@gmail.com).');

        // Check if database contains outdated tech conference events
        const firstEvent = await this.eventRepository.findOne({ where: {} });
        const isOldData = firstEvent && (
            firstEvent.title.includes('NestJS') ||
            firstEvent.title.includes('Tech Summit') ||
            firstEvent.title.includes('Bootcamp') ||
            firstEvent.title.includes('Masterclass')
        );

        const eventCount = await this.eventRepository.count();
        if (eventCount >= 20 && !isOldData) {
            this.logger.log('🎬 Cinema database already populated with movie screenings. Syncing seat cache to Redis...');
            const existingSeats = await this.seatRepository.find();
            const pipeline = this.redisClient.pipeline();
            for (const s of existingSeats) {
                pipeline.hset(`seat:${s.id}`, {
                    status: s.status,
                    eventId: s.eventId,
                    price: Number(s.price),
                    seatNumber: s.seatNumber,
                });
            }
            await pipeline.exec();
            this.logger.log('✅ Synced cinema movie seats to Redis.');
            return;
        }

        if (eventCount > 0) {
            this.logger.log('🔄 Upgrading old database events to 20 authentic Cinema & Movie Theater Screenings...');
            await this.seatRepository.createQueryBuilder().delete().execute();
            await this.eventRepository.createQueryBuilder().delete().execute();
        }

        this.logger.log('🍿 Seeding 20 blockbuster cinema screenings with natural theater seating layouts...');

        // 1. Create 5 Sample Dummy Movie Fans
        const userCount = await this.userRepository.count();
        if (userCount === 0) {
            const passwordHash = await bcrypt.hash('password123', 10);
            const dummyUsers = [
                { email: 'user1@gmail.com', name: 'Cinephile One', passwordHash },
                { email: 'user2@gmail.com', name: 'Moviegoer Two', passwordHash },
                { email: 'user3@gmail.com', name: 'Cinema Fan Three', passwordHash },
                { email: 'user4@gmail.com', name: 'Theater Patron Four', passwordHash },
                { email: 'user5@gmail.com', name: 'IMAX Buff Five', passwordHash },
            ];
            await this.userRepository.save(this.userRepository.create(dummyUsers));
            this.logger.log('👤 Created 5 cinema user accounts (user1@gmail.com to user5@gmail.com).');
        }

        // 2. Create 20 Cinema Screenings and 50 Seats per Theater
        // Tiered Cinema Rows:
        // Rows A & B: VIP Recliner Lounge ($28.00 / $24.00)
        // Rows C & D: Prime Center View ($20.00 / $18.00)
        // Row E: Standard Screen View ($14.00)
        const rowConfigs = [
            { row: 'A', count: 10, price: 28.0 },
            { row: 'B', count: 10, price: 24.0 },
            { row: 'C', count: 10, price: 20.0 },
            { row: 'D', count: 10, price: 18.0 },
            { row: 'E', count: 10, price: 14.0 },
        ];

        for (let index = 0; index < sampleEvents.length; index++) {
            const sample = sampleEvents[index];
            const event = this.eventRepository.create({
                title: sample.title,
                description: sample.description,
                venue: sample.venue,
                category: sample.category,
                imageUrl: sample.imageUrl,
                eventDate: new Date(Date.now() + (index + 1) * 18 * 60 * 60 * 1000), // Spaced showtimes
                totalSeats: 50,
            });
            const savedEvent = await this.eventRepository.save(event);

            const seats: Partial<Seat>[] = [];
            for (const cfg of rowConfigs) {
                for (let num = 1; num <= cfg.count; num++) {
                    seats.push({
                        eventId: savedEvent.id,
                        seatNumber: `${cfg.row}-${num}`,
                        price: cfg.price,
                        status: SeatStatus.AVAILABLE,
                    });
                }
            }
            const savedSeats = await this.seatRepository.save(seats);

            // Populate Redis for atomic Lua locks
            const pipeline = this.redisClient.pipeline();
            for (const s of savedSeats) {
                pipeline.hset(`seat:${s.id}`, {
                    status: SeatStatus.AVAILABLE,
                    eventId: s.eventId,
                    price: Number(s.price),
                    seatNumber: s.seatNumber,
                });
            }
            await pipeline.exec();
        }

        this.logger.log('✅ Cinema Box Office initialization complete! 20 Movie Screenings with 1,000 theater seats active.');

    }
}
