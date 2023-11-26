const start = Date.now();
let c = 0;

export function log(message: any, ...optionalParams: any) {
  if (true || process.env.TEST) {
    const ct = `${++c}`.padStart(3, "0");
    console.log(`${ct}:${Date.now() - start}ms\t`, message, ...optionalParams);
  }
}
