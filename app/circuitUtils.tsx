import { compile, createFileManager } from '@noir-lang/noir_wasm';
import { getNFTOwners } from './merklePath';

const mainBeginning = `use dep::std::ecdsa_secp256k1::verify_signature;
use dep::array_helpers;
use dep::std;

fn main(
  pub_key_x: [u8; 32],
  pub_key_y: [u8; 32],
  signature: [u8; 64],
  hashed_message: pub [u8; 32],
) {
    // First, let's check if signature is vaild and corresponds to the public key provided
    let valid_signature = verify_signature(pub_key_x, pub_key_y, signature, hashed_message);
    assert(valid_signature);
    
    // Check address is an NFT holder
    let pub_key = array_helpers::u8_32_to_u8_64_unconstrained(pub_key_x, pub_key_y);
    let hashed_pub_key = std::hash::keccak256(pub_key, 64);
    let mut addr: Field = 0;
    for i in 0..20 {
        // shift left by 8 and add the new value
        addr = (addr * 256) + hashed_pub_key[i + 12] as Field;
    }

    let result = ` 
    // (address == holder1) | (address == holder2)
const mainEnd = `;
    assert(result);
}`

async function generateCircuitCode(nftAddress: string){
    let circuitCode = mainBeginning
    var holders = await getNFTOwners(nftAddress) 

    holders.forEach((holder) => {
        circuitCode += `(addr == ${holder}) |`
    });
    circuitCode = circuitCode.slice(0, circuitCode.length - 2)
    circuitCode += mainEnd
    return circuitCode
}

const nargo = `[package]
name = "zupass_scroll"
type = "bin"
authors = [""]
compiler_version = "0.33.0"

[dependencies]
array_helpers = { tag = "v0.19.0", git = "https://github.com/AlanVerbner/noir-array-helpers" }`

export async function getCircuit(nftAddress: string) {
    const beginTime = performance.now()
    const fm = createFileManager('/');

    const main = await generateCircuitCode(nftAddress)
    const mainStream: ReadableStream<Uint8Array> = new Blob([main]).stream();
    await fm.writeFile('./src/main.nr', mainStream);

    const nargoStream: ReadableStream<Uint8Array> = new Blob([nargo]).stream();
    await fm.writeFile('./Nargo.toml', nargoStream);

    const result = await compile(fm);
    if (!('program' in result)) {
        throw new Error('Compilation failed');
    }

    const endTime = performance.now()
    console.log("compilation time", endTime - beginTime)

    return result.program;
}
