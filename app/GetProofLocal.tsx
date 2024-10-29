'use client';
import * as React from 'react';
import { SigningKey, ethers } from 'ethers';
import { useAccount, useSignMessage } from 'wagmi';
import sindri from 'sindri';
import { PATH_LENGTH, getMerklePath, verify } from './merklePath';
import { compile_program, createFileManager } from '@noir-lang/noir_wasm';
import { getCircuit } from './circuitUtils';
import { BarretenbergBackend, ProofData } from '@noir-lang/backend_barretenberg';
import { Noir } from '@noir-lang/noir_js';


type GetProofProps = {
  nftAddress: `0x${string}`;
  message: string;
};

const GetProofLocal: React.FC<GetProofProps> = (props) => {
  const { nftAddress, message } = props;
  const { data: signature, signMessage, status } = useSignMessage();
  const { address } = useAccount();
  const [text, setText] = React.useState("Get Proof Local")

  React.useEffect(() => {
    (async () => {
      if (signature && status === 'success') {
        setText("SIGNED")
        
        var hashedMessage = ethers.hashMessage(message);
        var publicKey = SigningKey.recoverPublicKey(hashedMessage, signature);
        publicKey = publicKey.substring(4);
        let pub_key_x = publicKey.substring(0, 64);
        let pub_key_y = publicKey.substring(64);

        var sSignature = Array.from(ethers.getBytes(signature));
        sSignature.pop();

        const input = {
          pub_key_x: Array.from(ethers.getBytes('0x' + pub_key_x)),
          pub_key_y: Array.from(ethers.getBytes('0x' + pub_key_y)),
          signature: sSignature,
          hashed_message: Array.from(ethers.getBytes(hashedMessage)),
        }

        console.log("COMPILING")
        const circuit = await getCircuit(nftAddress);
        console.log("PROVING")
        const beginTime = performance.now()
        const backend = new BarretenbergBackend(circuit);
        const noir = new Noir(circuit);
        const { witness } = await noir.execute(input);
        const proof = await backend.generateProof(witness);
        const endTime = performance.now()
        console.log("proving time:", endTime - beginTime)
        
        console.log(proof);
        setText("DONE")
      }
    })();
  }, [signature, status]);

  return (
    <button
      onClick={() => {
        signMessage({ message });
      }}
    >
      {text}
    </button>
  );
};

export default GetProofLocal;
