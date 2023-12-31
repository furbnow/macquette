import { Result } from '../../src/helpers/result';
import { parseRoute } from '../../src/ui/routes';

describe('routes', () => {
  describe('parseRoute', () => {
    const results = [
      { hash: '#', result: Result.ok(null) },
      {
        hash: '#/nonsense',
        result: Result.err('empty path segment must not be followed by another segment'),
      },
      { hash: '#1/2/3', result: Result.err('too many path segments') },
      {
        hash: '#master/elements',
        result: Result.ok({
          type: 'with scenario',
          page: 'elements',
          scenarioId: 'master',
        }),
      },
      {
        hash: '#baseline/',
        result: Result.err('second segment should not be empty'),
      },
      {
        hash: '#elements',
        result: Result.err("route 'elements' requires a scenario name"),
      },
      {
        hash: '#commentary',
        result: Result.ok({
          type: 'standalone',
          page: 'commentary',
        }),
      },
    ];

    it.each(results)('parses $hash correctly', ({ hash, result }) => {
      expect(parseRoute(hash)).toEqual(result);
    });
  });
});
