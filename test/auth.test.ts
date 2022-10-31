/* eslint no-undef: "off" */
import { generateJwt, verifyJwt } from '../src/lib/auth';

test('JWT generation and verification work', () => {
  const jwtToken = generateJwt('test', 'secret');
  expect(verifyJwt(jwtToken, 'secret')).toBe(true);
});
