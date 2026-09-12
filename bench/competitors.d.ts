declare module "crypto-randomuuid" {
  const randomUuid: (options?: { disableEntropyCache?: boolean }) => string;
  export default randomUuid;
}
