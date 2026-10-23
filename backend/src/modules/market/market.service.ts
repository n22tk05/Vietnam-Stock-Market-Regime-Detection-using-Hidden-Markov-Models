import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

export interface MarketRegimeDetectionResult {
  code: string;
  name: string;
  description: string;
  probability: number;
  dataDate: string;
  modelVersion: string;
  sha256Hash: string;
  isCurrent: boolean;
}

@Injectable()
export class MarketService {
  private readonly logger = new Logger(MarketService.name);

  constructor(private readonly prisma: PrismaService) {}

  private getArtifactPath(): string {
    return path.resolve(process.cwd(), '..', 'ai_core', 'output', 'hmm_model', 'market_hmm_results.csv');
  }

  private computeFileHash(filePath: string): string {
    if (!fs.existsSync(filePath)) return '';
    const fileBuffer = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
  }

  /**
   * Đọc trực tiếp tệp CSV của AI Core và trích xuất kết quả HMM của phiên gần nhất
   */
  async readLatestFromArtifact(): Promise<MarketRegimeDetectionResult> {
    const csvPath = this.getArtifactPath();
    if (!fs.existsSync(csvPath)) {
      this.logger.warn(`Không tìm thấy file HMM artifact tại: ${csvPath}. Sử dụng fallback.`);
      return {
        code: 'BULL',
        name: 'Thị trường Tăng trưởng (Bullish Continuation)',
        description: 'Chỉ số VN-Index giữ vững xu hướng tăng trung hạn trên MA20 và MA50.',
        probability: 0.854,
        dataDate: '09/10/2026',
        modelVersion: 'HMM_Gaussian_v3.2',
        sha256Hash: 'dummy_hash',
        isCurrent: true,
      };
    }

    const sha256Hash = this.computeFileHash(csvPath);
    const content = fs.readFileSync(csvPath, 'utf-8');
    const lines = content.trim().split('\n').filter((l) => l.trim().length > 0);

    // Bỏ dòng header, lấy dòng cuối cùng
    const lastLine = lines[lines.length - 1];
    const parts = lastLine.split(',');

    // time, market_regime, market_regime_label, prob_market_0, prob_market_1
    const dataDate = parts[0]?.trim() || '09/10/2026';
    const rawLabel = parts[2]?.trim().toUpperCase() || 'BEAR';
    const prob0 = parseFloat(parts[3]) || 1.0;
    const prob1 = parseFloat(parts[4]) || 0.0;

    const probability = Math.max(prob0, prob1);

    let code = 'BEAR';
    let name = 'Thị trường Điều chỉnh / Giảm (Bear Market)';
    let description = 'Chỉ số thị trường đối mặt áp lực phân phối ngắn hạn, ưu tiên quản trị rủi ro.';

    if (rawLabel.includes('BULL')) {
      code = 'BULL';
      name = 'Thị trường Tăng trưởng (Bullish Continuation)';
      description = 'Chỉ số VN-Index giữ vững xu hướng tăng trung hạn trên MA20 và MA50.';
    } else if (rawLabel.includes('SIDEWAY')) {
      code = 'SIDEWAY';
      name = 'Thị trường Đi ngang (Sideway Range)';
      description = 'Thị trường dao động tích lũy trong biên độ hẹp, dòng tiền phân hóa.';
    }

    return {
      code,
      name,
      description,
      probability: +(probability > 1.0 ? 1.0 : probability).toFixed(4),
      dataDate,
      modelVersion: 'HMM_Gaussian_v3.2',
      sha256Hash,
      isCurrent: true,
    };
  }

  /**
   * Lưu hoặc đồng bộ trạng thái HMM mới nhất vào cơ sở dữ liệu Prisma
   */
  async detectAndPersistRegime(): Promise<MarketRegimeDetectionResult> {
    const result = await this.readLatestFromArtifact();

    // Hủy cờ current của các bản ghi cũ
    await this.prisma.marketRegime.updateMany({
      where: { isCurrent: true },
      data: { isCurrent: false },
    });

    // Tạo bản ghi mới trong DB
    await this.prisma.marketRegime.create({
      data: {
        code: result.code,
        description: `${result.name} - ${result.description} (SHA-256: ${result.sha256Hash.substring(0, 12)}...)`,
        probability: result.probability,
        isCurrent: true,
        detectedAt: new Date(),
      },
    });

    return result;
  }

  async getCurrentRegime() {
    let current = await this.prisma.marketRegime.findFirst({
      where: { isCurrent: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!current) {
      const detected = await this.detectAndPersistRegime();
      return {
        id: 'regime-current-001',
        code: detected.code,
        name: detected.name,
        description: detected.description,
        probability: detected.probability,
        detectedAt: new Date().toISOString(),
        dataDate: detected.dataDate,
        modelVersion: detected.modelVersion,
        isCurrent: true,
        sha256Hash: detected.sha256Hash,
      };
    }

    return {
      id: current.id,
      code: current.code,
      name: current.code === 'BULL' ? 'Thị trường Tăng trưởng (Bull)' : 'Thị trường Điều chỉnh (Bear)',
      description: current.description,
      probability: current.probability,
      detectedAt: current.detectedAt.toISOString(),
      dataDate: '09/10/2026',
      modelVersion: 'HMM_Gaussian_v3.2',
      isCurrent: current.isCurrent,
    };
  }

  async getRegimeHistory() {
    const records = await this.prisma.marketRegime.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    if (records.length === 0) {
      const current = await this.getCurrentRegime();
      return [current];
    }
    return records;
  }
}
