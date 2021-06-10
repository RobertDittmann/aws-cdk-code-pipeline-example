const GREETING = "Hello, AWS!";
export async function main(event: any, context: any) {
    console.log(GREETING);
    return GREETING;
}
