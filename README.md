# chain-chip-analytics

Chain token chip analysis for Solana + Base.

## Status
Manual Next.js skeleton (offline). Waiting on:
- API keys (Birdeye, Helius, Alchemy)
- `npm install` when network permissions are available

## Structure
- `src/providers`: Third-party API clients
- `src/engines`: Business logic (chip distribution, cost basis, profit ratio)
- `src/hooks`: Frontend hooks
- `src/types`: Shared types

## Next steps
1. Run `npm install`
2. Wire providers to Birdeye/Helius/Alchemy
3. Implement engines for cost-basis + top-100 profit ratio
4. Hook UI to `/api/analyze` with polling
