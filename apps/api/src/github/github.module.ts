import { Module } from '@nestjs/common';
import { GithubService } from './github.service';
import { GithubScanner } from './github.scanner';

@Module({
  providers: [GithubService, GithubScanner],
  exports: [GithubService, GithubScanner],
})
export class GithubModule {}
