import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type FhirBundle = {
  resourceType: 'Bundle';
  total?: number;
  entry?: Array<{ resource?: FhirResource }>;
};

type FhirResource = {
  resourceType?: string;
  id?: string;
  active?: boolean;
  meta?: {
    lastUpdated?: string;
  };
  name?: Array<{
    text?: string;
    family?: string;
    given?: string[];
  }>;
  qualification?: Array<{
    code?: {
      coding?: Array<{
        system?: string;
        code?: string;
        display?: string;
      }>;
      text?: string;
    };
  }>;
};

export type HealthVerificationResult = {
  matched: boolean;
  notFound: boolean;
  rpps: string;
  practitioner?: {
    id?: string;
    active?: boolean;
    firstName?: string;
    lastName?: string;
    fullName?: string;
    lastUpdated?: string;
    profession?: string;
    specialty?: string;
  };
  bundleTotal: number;
  rawSummary: Record<string, unknown>;
};

@Injectable()
export class AnsDirectoryService {
  constructor(private readonly config: ConfigService) {}

  normalizeRpps(value: string) {
    return value.replace(/\D/g, '');
  }

  async verifyPractitioner(input: {
    rpps: string;
    firstName?: string | null;
    lastName?: string | null;
  }): Promise<HealthVerificationResult> {
    const rpps = this.normalizeRpps(input.rpps);
    if (rpps.length < 8 || rpps.length > 14) {
      throw new BadRequestException('Numero RPPS invalide.');
    }

    const apiKey = this.config.get<string>('ANS_API_KEY');
    if (!apiKey) {
      throw new BadRequestException('La cle API ANS n est pas configuree.');
    }

    const baseUrl = (
      this.config.get<string>('ANS_FHIR_BASE_URL') ||
      'https://gateway.api.esante.gouv.fr/fhir/v2'
    ).replace(/\/$/, '');
    const url = new URL(`${baseUrl}/Practitioner`);
    url.searchParams.set('identifier', rpps);
    url.searchParams.set('active', 'true');
    url.searchParams.set('_revinclude', 'PractitionerRole:practitioner');

    const bundle = await this.fetchBundle(url.toString(), apiKey);
    const practitioner = bundle.entry
      ?.map((entry) => entry.resource)
      .find((resource) => resource?.resourceType === 'Practitioner');

    if (!practitioner) {
      return {
        matched: false,
        notFound: true,
        rpps,
        bundleTotal: bundle.total || 0,
        rawSummary: { total: bundle.total || 0 },
      };
    }

    const parsed = this.parsePractitioner(practitioner);
    const nameMatches = this.nameMatches(input, parsed);

    return {
      matched: nameMatches && practitioner.active !== false,
      notFound: false,
      rpps,
      practitioner: parsed,
      bundleTotal: bundle.total || 0,
      rawSummary: {
        total: bundle.total || 0,
        practitioner: parsed,
        includedResourceTypes: this.includedResourceTypes(bundle),
      },
    };
  }

  private async fetchBundle(url: string, apiKey: string): Promise<FhirBundle> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'ESANTE-API-KEY': apiKey,
          Accept: 'application/fhir+json, application/json',
        },
        signal: controller.signal,
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new ServiceUnavailableException({
          message: 'Verification ANS indisponible.',
          status: response.status,
          details: payload,
        });
      }

      if (!payload || payload.resourceType !== 'Bundle') {
        throw new ServiceUnavailableException('Reponse ANS inattendue.');
      }

      return payload;
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        throw new ServiceUnavailableException('Verification ANS expiree.');
      }
      if (error instanceof ServiceUnavailableException) throw error;
      throw new ServiceUnavailableException('Verification ANS indisponible.');
    } finally {
      clearTimeout(timeout);
    }
  }

  private parsePractitioner(resource: FhirResource) {
    const primaryName = resource.name?.[0] || {};
    const qualificationCodings =
      resource.qualification?.flatMap((qualification) => qualification.code?.coding || []) || [];
    const profession = qualificationCodings.find((coding) =>
      coding.system?.includes('ProfessionSante'),
    )?.display;
    const specialty = qualificationCodings.find((coding) =>
      coding.system?.includes('Specialite'),
    )?.display;

    return {
      id: resource.id,
      active: resource.active,
      firstName: primaryName.given?.[0],
      lastName: primaryName.family,
      fullName:
        primaryName.text ||
        [primaryName.given?.join(' '), primaryName.family].filter(Boolean).join(' '),
      lastUpdated: resource.meta?.lastUpdated,
      profession,
      specialty,
    };
  }

  private nameMatches(
    input: { firstName?: string | null; lastName?: string | null },
    practitioner: { firstName?: string; lastName?: string; fullName?: string },
  ) {
    const expectedFirstName = this.normalizeName(input.firstName);
    const expectedLastName = this.normalizeName(input.lastName);
    const firstName = this.normalizeName(practitioner.firstName || practitioner.fullName);
    const lastName = this.normalizeName(practitioner.lastName || practitioner.fullName);
    const fullName = this.normalizeName(practitioner.fullName);

    const firstMatches =
      !expectedFirstName ||
      firstName.includes(expectedFirstName) ||
      fullName.includes(expectedFirstName);
    const lastMatches =
      !expectedLastName ||
      lastName.includes(expectedLastName) ||
      fullName.includes(expectedLastName);

    return firstMatches && lastMatches;
  }

  private normalizeName(value?: string | null) {
    return (value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z]/g, '');
  }

  private includedResourceTypes(bundle: FhirBundle) {
    return Array.from(
      new Set(
        bundle.entry
          ?.map((entry) => entry.resource?.resourceType)
          .filter((type): type is string => Boolean(type)) || [],
      ),
    );
  }
}
