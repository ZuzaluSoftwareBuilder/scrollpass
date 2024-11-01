'use client';
import * as React from 'react';
import { SigningKey, ethers } from 'ethers';
import { useAccount, useSignMessage } from 'wagmi';
import sindri from 'sindri';
import { PATH_LENGTH, getMerklePath, verify } from './merklePath';

type GetProofProps = {
  nftAddress: `0x${string}`;
  message: string;
};

const GetProof: React.FC<GetProofProps> = (props) => {
  const { nftAddress, message } = props;
  const { data: signature, signMessage, status } = useSignMessage();
  const { address } = useAccount();
  const [text, setText] = React.useState("Get Proof")

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

        const merkleData = await getMerklePath(nftAddress, address);

        const input = JSON.stringify({
          pub_key_x: Array.from(ethers.getBytes('0x' + pub_key_x)),
          pub_key_y: Array.from(ethers.getBytes('0x' + pub_key_y)),
          signature: sSignature,
          hashed_message: Array.from(ethers.getBytes(hashedMessage)),
          root: merkleData.root,
          hash_path: merkleData.path,
          index: merkleData.index,
        });

        setText("PROVING")
        const circuitIdentifier = `zupass-scroll:${PATH_LENGTH}`;
        sindri.authorize({ apiKey: process.env.NEXT_PUBLIC_SINDRI_API_KEY });
        const result = await sindri.proveCircuit(
          circuitIdentifier,
          input,
          true,
        );

        const proof = result.proof.proof;
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

export default GetProof;
