'use client';

import addIcon from '@/assets/add.svg';
import bitcoinIcon from '@/assets/bitcoin.png';
import infoIcon from '@/assets/info.svg';
import particleLogo from '@/assets/particle-logo.svg';
import removeIcon from '@/assets/remove.svg';
import { accountContracts, type ContractName } from '@/config';
import typedData from '@/config/typedData';
import { Button, Checkbox, Divider, Input, Select, SelectItem, useDisclosure } from '@nextui-org/react';
import {
  useAccountContract,
  useAccounts,
  useBTCProvider,
  useConnectModal,
  useConnector,
  useETHProvider,
  type BaseConnector,
} from '@particle-network/btc-connectkit';

import { chains } from '@particle-network/chains';
import { useRequest } from 'ahooks';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { isAddress, isHex, type Hex } from 'viem';
import { AccountInfoModal } from '../accountInfoModal';
import { VerifyModal } from '../verifyModal';

type TxData = {
  to: string;
  value: string;
  data: string;
};

const personalSignMessage =
  'Hello Particle!\n\nThe First Account Abstraction Protocol on Bitcoin.\n\nhttps://particle.network';

export default function Home() {
  const { openConnectModal, openConnectModalAsync, disconnect } = useConnectModal();
  const { accounts } = useAccounts();
  const { account, chainId, switchChain, walletClient, getFeeQuotes, sendUserOp } = useETHProvider();
  const { provider, getNetwork, switchNetwork, signMessage, getPublicKey, sendBitcoin, sendInscription } =
    useBTCProvider();
  const [gasless, setGasless] = useState<boolean>(false);
  const [forceHideModal, setForceHideModal] = useState<boolean>(false);
  const [inscriptionReceiverAddress, setInscriptionReceiverAddress] = useState<string>();
  const [inscriptionId, setInscriptionId] = useState<string>();
  const [message, setMessage] = useState<string>('Hello, Particle!');
  const [address, setAddress] = useState<string>();
  const [satoshis, setSatoshis] = useState<string>('1');
  const { connectors, connect } = useConnector();
  const [directConnectors, setDirectConnectors] = useState<BaseConnector[]>();
  const [txDatas, setTxDatas] = useState<TxData[]>([
    {
      to: '',
      value: '0x0',
      data: '0x',
    },
  ]);
  const { accountContract, setAccountContract } = useAccountContract();

  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [signData, setSignData] = useState<{
    signature: string;
    data: any;
  }>();

  const { isOpen: infoIsOpen, onOpen: infoOnOpen, onOpenChange: infoOnOpenChange } = useDisclosure();

  const onGetNetwork = async () => {
    try {
      const network = await getNetwork();
      toast.success(network);
    } catch (error: any) {
      console.log('🚀 ~ onGetNetwork ~ error:', error);
      toast.error(error.message || 'get network error');
    }
  };

  const onSwitchNetwork = async () => {
    try {
      const network = await getNetwork();
      const changeTo = network === 'livenet' ? 'testnet' : 'livenet';
      await switchNetwork(changeTo);
      toast.success(`Change To ${changeTo}`);
    } catch (error: any) {
      console.log('🚀 ~ onSwitchNetwork ~ error:', error);
      toast.error(error.message || 'switch chain error');
    }
  };

  const onGetPubkey = async () => {
    try {
      const pubKey = await getPublicKey();
      console.log('🚀 ~ onGetPubkey ~ pubKey:', pubKey);
      toast.success(pubKey);
    } catch (error: any) {
      toast.error(error.message || 'get pubkey error');
    }
  };

  const onSignMessage = async () => {
    if (!message) {
      return;
    }
    try {
      const sig = await signMessage(message);
      toast.success(sig);
    } catch (error: any) {
      toast.error(error.message || 'sign message error');
    }
  };

  const onSendBitcoin = async () => {
    if (!address) {
      toast.error('Please enter the address');
      return;
    }
    if (!satoshis) {
      toast.error('Please enter the amount');
      return;
    }
    try {
      const txId = await sendBitcoin(address, Number(satoshis));
      toast.success(txId);
    } catch (error: any) {
      toast.error(error.message || 'send bitcoin error');
      console.log('🚀 ~ onSendBitcoin ~ error:', error);
    }
  };

  const onSendInscription = async () => {
    if (!inscriptionReceiverAddress) {
      toast.error('Please enter the receiver address');
      return;
    }
    if (!inscriptionId) {
      toast.error('Please enter the inscription id');
      return;
    }
    if (!provider) {
      toast.error('Please connect wallet');
      return;
    }
    try {
      const result = await sendInscription(inscriptionReceiverAddress, inscriptionId);
      const txId = result.txid;
      console.log('send inscription success, txid:', txId);
      toast.success(`send success \n${txId}`);
    } catch (error: any) {
      toast.error(error.message || 'send inscription error');
      console.log('🚀 ~ onSendInscription ~ error:', error);
    }
  };

  const onSwitchChain = async (e: any) => {
    const chainId = Number(e.target.value);
    if (chainId) {
      try {
        await switchChain(chainId);
      } catch (error: any) {
        toast.error(error.message || 'switch chain error');
        console.log('🚀 ~ onSwitchChain ~ error:', error);
      }
    }
  };

  const { run: onSendUserOp, loading: sendUserOpLoading } = useRequest(
    async (withQuote: boolean) => {
      if (txDatas.some((tx) => !isAddress(tx.to) || !isHex(tx.data) || !isHex(tx.value))) {
        throw new Error('Params Error, To is EVM address, Data and Value are hex string.');
      }
      if (withQuote) {
        const feeQuotes = await getFeeQuotes(txDatas);
        const { userOp, userOpHash } =
          (gasless && feeQuotes.verifyingPaymasterGasless) || feeQuotes.verifyingPaymasterNative;
        const hash = await sendUserOp({ userOp, userOpHash }, forceHideModal);
        return hash;
      }
      const hash = await sendUserOp({ tx: txDatas }, forceHideModal);
      return hash;
    },
    {
      manual: true,
      onSuccess: (hash) => {
        toast.success('Send Success!', {
          onClick: () => {
            const chain = chains.getEVMChainInfoById(chainId ?? 0);
            if (chain) {
              window.open(`${chain.blockExplorerUrl}/tx/${hash}`, '_blank');
            }
          },
        });
      },
      onError: (error: any) => {
        console.log('🚀 ~ onSendUserOp ~ error:', error);
        toast.error(error.data?.extraMessage?.message || error.details || error.message || 'send user operation error');
      },
    }
  );

  const { run: onPersonalSign, loading: personalSignLoading } = useRequest(
    async () => {
      const result = await walletClient.signMessage({
        account: account as Hex,
        message: personalSignMessage,
      });
      return result;
    },
    {
      manual: true,
      onSuccess: (signature) => {
        setSignData({
          signature,
          data: personalSignMessage,
        });
        onOpen();
        toast.success('personal sign success');
      },
      onError: (error: any) => {
        toast.error(error.details || error.message || 'personal sign error');
      },
    }
  );

  const { run: onSignTypedData, loading: signTypedDataLoading } = useRequest(
    async () => {
      const result = await walletClient.signTypedData({
        account: account as Hex,
        ...typedData,
      } as any);
      return result;
    },
    {
      manual: true,
      onSuccess: (signature) => {
        setSignData({
          signature,
          data: typedData,
        });
        onOpen();
        toast.success('sign typedData success');
      },
      onError: (error: any) => {
        toast.error(error.details || error.message || 'sign typedData error');
      },
    }
  );

  useEffect(() => {
    setDirectConnectors(connectors.filter((item) => item.isReady()));
  }, [connectors]);

  const addTxData = () => {
    if (txDatas.length < 5) {
      setTxDatas([
        ...txDatas,
        {
          to: '',
          value: '0x0',
          data: '0x',
        },
      ]);
    }
  };

  const removeTxData = () => {
    if (txDatas.length > 1) {
      setTxDatas(txDatas.slice(0, txDatas.length - 1));
    }
  };

  const onToChanged = (to: string, index: number) => {
    txDatas[index].to = to;
    setTxDatas([...txDatas]);
  };

  const onValueChanged = (value: string, index: number) => {
    txDatas[index].value = value;
    setTxDatas([...txDatas]);
  };

  const onDataChanged = (data: string, index: number) => {
    txDatas[index].data = data;
    setTxDatas([...txDatas]);
  };

  const accountContractList = Object.keys(accountContracts)
    .map((key) => accountContracts[key as ContractName].map((item) => ({ name: key, version: item.version })))
    .reduce((previousValue, currentValue) => [...previousValue, ...currentValue]);

  useEffect(() => {
    if (chainId) {
      const config = accountContracts[accountContract.name as ContractName]?.find(
        (item) => item.version === accountContract.version
      );
      if (config && !config.chainIds.includes(chainId)) {
        switchChain(config.chainIds[0]);
      }
    }
  }, [accountContract, chainId, switchChain, accountContractList]);

  const connectWallet = async () => {
    if (openConnectModalAsync) {
      try {
        const accounts = await openConnectModalAsync();
        console.log('connect success', accounts);
      } catch (error: any) {
        toast.error(error.message || 'connect error');
      }
    }
  };

  return (
    <div className="container mx-auto flex h-full flex-col items-center gap-6 overflow-auto py-10">
      <Image src={particleLogo} alt="" className=""></Image>
      <div className="flex items-center gap-3 text-2xl font-bold">
        <Image src={bitcoinIcon} alt="" className="inline h-10 w-10 rounded-full"></Image>
        BTC Connect
      </div>

      <div className=" -skew-x-6">The First Account Abstraction Protocol on Bitcoin</div>

      <div className="absolute right-4 top-4">
        {accounts.length === 0 && (
          <Button color="primary" onClick={connectWallet}>
            Connect
          </Button>
        )}
        {accounts.length !== 0 && (
          <Button color="primary" onClick={disconnect}>
            Disconnect
          </Button>
        )}
      </div>

      {accounts.length === 0 && directConnectors && (
        <>
          <Divider></Divider>
          <div className="mt-6 flex gap-8">
            {directConnectors.map((connector) => {
              return (
                <Image
                  key={connector.metadata.id}
                  src={connector.metadata.icon}
                  alt={connector.metadata.name}
                  width={50}
                  height={50}
                  className="cursor-pointer rounded-lg"
                  onClick={() => connect(connector.metadata.id)}
                ></Image>
              );
            })}
          </div>
        </>
      )}

      <div className="mt-12 flex h-auto w-[40rem] max-w-full flex-col gap-4 rounded-lg p-4 shadow-md">
        <div className="mb-4 text-2xl font-bold">Bitcoin</div>

        <div className="overflow-hidden text-ellipsis whitespace-nowrap">Addresses: {accounts.join(', ')}</div>

        <Button color="primary" onClick={onGetNetwork}>
          Get Network
        </Button>

        <Button color="primary" onClick={onSwitchNetwork}>
          Change Network
        </Button>

        <Button color="primary" onClick={onGetPubkey}>
          Get Pubkey
        </Button>

        <Divider />
        <Input label="Message" value={message} onValueChange={setMessage}></Input>
        <Button color="primary" onClick={onSignMessage}>
          Sign Message
        </Button>

        <Divider />
        <Input label="Address" value={address} onValueChange={setAddress}></Input>
        <Input label="Satoshis" value={satoshis} onValueChange={setSatoshis} inputMode="numeric"></Input>
        <Button color="primary" onClick={onSendBitcoin}>
          Send Bitcoin
        </Button>

        {accounts.length !== 0 && (
          <div className="flex flex-col gap-4">
            <Divider></Divider>
            <Input
              label="Receiver Address"
              value={inscriptionReceiverAddress}
              onValueChange={setInscriptionReceiverAddress}
            ></Input>
            <Input label="Inscription ID" value={inscriptionId} onValueChange={setInscriptionId}></Input>
            <Button color="primary" onClick={onSendInscription}>
              Send Inscription
            </Button>
          </div>
        )}
      </div>

      <div className="relative mb-20 mt-20 flex h-auto w-[40rem] max-w-full flex-col gap-4 rounded-lg p-4 shadow-md">
        <div className="mb-4 text-2xl font-bold">EVM</div>
        {account && (
          <Image src={infoIcon} alt="" className="absolute right-4 mt-1 cursor-pointer" onClick={infoOnOpen}></Image>
        )}

        <div className="overflow-hidden text-ellipsis whitespace-nowrap">
          <Select
            label="Account Contract"
            size="sm"
            selectedKeys={[`${accountContract.name}-${accountContract.version}`]}
            onChange={(event) => {
              const value = event?.target?.value as string;
              if (value) {
                const [name, version] = value.split('-');
                setAccountContract({ name, version });
              }
            }}
            isRequired
          >
            {accountContractList.map((contract) => {
              return (
                <SelectItem key={`${contract.name}-${contract.version}`} value={`${contract.name}-${contract.version}`}>
                  {`${contract.name}-${contract.version}`}
                </SelectItem>
              );
            })}
          </Select>
        </div>
        <div className="overflow-hidden text-ellipsis whitespace-nowrap">Address: {account}</div>
        <div className="overflow-hidden text-ellipsis whitespace-nowrap">ChainId: {chainId}</div>
        <Select
          label="Switch Chain"
          size="sm"
          selectedKeys={chainId ? [chainId?.toString()] : []}
          onChange={onSwitchChain}
          isRequired
        >
          {(
            accountContracts[accountContract.name as ContractName].find(
              (item) => item.version === accountContract.version
            )?.chainIds || []
          )?.map?.((chainId) => {
            const chain = chains.getEVMChainInfoById(chainId)!;
            return (
              <SelectItem key={chain.id} value={chain.id}>
                {chain.fullname}
              </SelectItem>
            );
          })}
        </Select>

        <Button
          color="primary"
          onClick={onPersonalSign}
          isLoading={personalSignLoading}
          className="px-10"
          isDisabled={account == null}
        >
          Personal Sign
        </Button>

        <Button
          color="primary"
          onClick={onSignTypedData}
          isLoading={signTypedDataLoading}
          className="px-10"
          isDisabled={account == null}
        >
          Sign Typed Data
        </Button>

        <Divider className="my-4"></Divider>

        <div className="flex justify-between font-medium">
          Send User Operation
          <div className="flex gap-4">
            <Image
              src={removeIcon}
              alt=""
              className="cursor-pointer data-[tx-amount='1']:hidden"
              data-tx-amount={txDatas.length}
              onClick={removeTxData}
            ></Image>
            <Image
              src={addIcon}
              alt=""
              className="cursor-pointer data-[tx-amount='5']:hidden"
              data-tx-amount={txDatas.length}
              onClick={addTxData}
            ></Image>
          </div>
        </div>

        {txDatas.map((tx, index) => (
          <div className="mt-2 flex w-full flex-col gap-2" key={index}>
            <Input label="To" value={tx.to} onValueChange={(value) => onToChanged(value, index)}></Input>
            <Input label="Value" value={tx.value} onValueChange={(value) => onValueChanged(value, index)}></Input>
            <Input label="Data" value={tx.data} onValueChange={(value) => onDataChanged(value, index)}></Input>
            <Divider></Divider>
          </div>
        ))}

        <div className="flex w-full justify-end gap-4">
          {/* <Checkbox isSelected={forceHideModal} onValueChange={setForceHideModal}>
            Force Hide Confirm Modal
          </Checkbox> */}

          <Checkbox isSelected={gasless} onValueChange={setGasless}>
            Gasless
          </Checkbox>
        </div>
        <Button
          color="primary"
          onClick={() => onSendUserOp(true)}
          isLoading={sendUserOpLoading}
          className="px-10"
          isDisabled={account == null}
        >
          Send With Fee Quote
        </Button>

        <Button
          color="primary"
          onClick={() => onSendUserOp(false)}
          isLoading={sendUserOpLoading}
          className="px-10"
          isDisabled={account == null}
        >
          Send
        </Button>
      </div>
      <VerifyModal isOpen={isOpen} onOpenChange={onOpenChange} signData={signData}></VerifyModal>
      <AccountInfoModal isOpen={infoIsOpen} onOpenChange={infoOnOpenChange}></AccountInfoModal>
    </div>
  );
}
