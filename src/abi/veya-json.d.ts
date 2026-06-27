declare module "./Veya.json" {
  const artifact: {
    abi: readonly Record<string, unknown>[];
    bytecode: string;
  };
  export default artifact;
}
