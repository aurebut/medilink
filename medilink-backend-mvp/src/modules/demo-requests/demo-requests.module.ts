import { Body, Controller, Injectable, Logger, Module, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { Transform } from 'class-transformer';
import { ArrayMaxSize, ArrayUnique, Equals, IsArray, IsEmail, IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { Public } from '../../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../notifications/email.service';
import { NotificationsModule } from '../notifications/notifications.module';

const trim = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value;

export class DemoRequestDto {
  @Transform(trim) @IsString() @MinLength(1) @MaxLength(100)
  firstName!: string;

  @Transform(trim) @IsString() @MinLength(1) @MaxLength(100)
  lastName!: string;

  @Transform(trim) @IsEmail() @MaxLength(254)
  email!: string;

  @IsOptional() @Transform(trim) @IsString() @MaxLength(30) @Matches(/^$|^[+0-9().\s-]{6,30}$/)
  phone?: string;

  @IsOptional() @Transform(trim) @IsString() @MaxLength(200)
  organization?: string;

  @IsIn(['Médecin remplaçant', 'Médecin installé', 'Responsable d’établissement', 'Équipe RH / recrutement', 'Autre'])
  role!: string;

  @IsArray() @ArrayMaxSize(3) @ArrayUnique()
  @IsIn(['Trouver une mission', 'Trouver un remplaçant', 'Organiser et suivre les remplacements'], { each: true })
  interests!: string[];

  @IsOptional() @Transform(trim) @IsString() @MaxLength(3000)
  message?: string;

  @Equals(true)
  consent!: boolean;

  @IsOptional() @IsString() @MaxLength(200)
  website?: string;
}

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));

@Injectable()
export class DemoRequestsService {
  private readonly logger = new Logger(DemoRequestsService.name);
  constructor(private readonly prisma: PrismaService, private readonly email: EmailService, private readonly config: ConfigService) {}

  async create(dto: DemoRequestDto) {
    if (dto.website) return { success: true };
    const { website, consent, ...details } = dto;
    const request = await this.prisma.demoRequest.create({ data: { ...details, email: details.email.toLowerCase(), consentAt: new Date() } });
    // The request remains available even if the email provider is temporarily unavailable.
    try {
      const configured = this.config.get<string>('DEMO_REQUEST_EMAIL');
      const recipients = configured ? [configured] : (await this.prisma.user.findMany({
        where: { role: 'MEDILINK_ADMIN', status: 'ACTIVE' }, select: { email: true },
      })).map(user => user.email);
      if (!recipients.length) this.logger.warn(`Demo request ${request.id} saved; no notification recipient configured.`);
      const rows = [
        ['Prénom', dto.firstName], ['Nom', dto.lastName], ['E-mail', dto.email],
        ['Téléphone', dto.phone || 'Non renseigné'], ['Structure', dto.organization || 'Non renseignée'],
        ['Profil', dto.role], ['Intérêts', dto.interests.join(', ') || 'Non renseignés'],
        ['Demande', dto.message || 'Non renseignée'],
      ];
      for (const to of recipients) {
        await this.email.sendEmail({ to, subject: 'Nouvelle demande de démo MédiLink', type: 'DEMO_REQUEST',
          html: `<h1>Nouvelle demande de démo</h1>${rows.map(([label, value]) => `<p><strong>${label}</strong><br>${escapeHtml(value).replace(/\n/g, '<br>')}</p>`).join('')}`,
        });
      }
    } catch {
      this.logger.error(`Demo request ${request.id} saved, but notification failed.`);
    }
    return { success: true };
  }
}

@Controller('demo-requests')
export class DemoRequestsController {
  constructor(private readonly requests: DemoRequestsService) {}

  @Public()
  @Post()
  @Throttle({ default: { limit: 5, ttl: 600000 } })
  create(@Body() dto: DemoRequestDto) { return this.requests.create(dto); }
}

@Module({ imports: [NotificationsModule], controllers: [DemoRequestsController], providers: [DemoRequestsService] })
export class DemoRequestsModule {}
