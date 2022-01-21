import type {ApiPromise} from '@polkadot/api'
import {numberToHex, hexAddPrefix, u8aToHex} from '@polkadot/util'
import {createApi} from 'lib/polkadotApi'
import {FormEventHandler, useCallback, useEffect, useRef, useState} from 'react'
import {
  create as createPhala,
  randomHex,
  signCertificate,
  CertificateData,
  PhalaInstance,
} from '@phala/sdk'
import {Input} from 'baseui/input'
import {Button} from 'baseui/button'
import {useAtom} from 'jotai'
import accountAtom from 'atoms/account'
import {getSigner} from 'lib/polkadotExtension'
import {FormControl} from 'baseui/form-control'
import {Select} from 'baseui/select'
import {ProgressSteps, Step} from 'baseui/progress-steps'
import {LabelXSmall, ParagraphMedium} from 'baseui/typography'
import {StyledSpinnerNext} from 'baseui/spinner'
import {Block} from 'baseui/block'
import {ButtonGroup} from 'baseui/button-group'
import {decodeAddress} from '@polkadot/util-crypto'

const baseURL = '/'
const CONTRACT_ID = 420


const Darkpool = ({api, phala}: {api: ApiPromise; phala: PhalaInstance}) => {
  const [account] = useAtom(accountAtom)
  const [certificateData, setCertificateData] = useState<CertificateData>()
  const [signCertificateLoading, setSignCertificateLoading] = useState(false)
  const unsubscribe = useRef<() => void>()

  const [side, setSide] = useState(true)
  const [size, setSize] = useState('')
  
  useEffect( () => {
    const _unsubscribe = unsubscribe.current
    return () => {
      api?.disconnect()
      _unsubscribe?.()
    }
  }, [api])

  useEffect(() => {
    setCertificateData(undefined)
  }, [account])

  const onSignCertificate = useCallback(async () => {
    if(account){
      setSignCertificateLoading(true)
      try{
        const signer = await getSigner(account)
        setCertificateData(
          await signCertificate({
            api,
            address: account.address,
            signer
          })
        )
        console.log("certificate signed");
      } catch (err) {
        console.log(err);
      }
      setSignCertificateLoading(false)
    }
  }, [])

  const onSendOrder = useCallback<FormEventHandler<HTMLFormElement>>(
    async (e) => {
      e.preventDefault();
      if(!account) return
      console.log("Sending command...");
      const signer = await getSigner(account)
      const orderIsBuy = side[0].side
      const orderSize = size
      try{
        const unsubscribe = await phala
              .command({
                account,
                contractId: CONTRACT_ID,
                payload: api
                  .createType('DarkpoolCommand',
                              {SendOrder: {is_buy: orderIsBuy, size: orderSize}})
                  .toHex(),
                signer,
                onStatus: (status) => {
                  if(status.isFinalized){
                    console.log("Command sent");
                    console.log(orderIsBuy)
                    console.log(orderSize)
                  }
                }
              })
      }catch(err){
        console.log(err);
      }
    }, [phala, api, certificateData, size, side])

  const onCancelOrder = useCallback(async () => {
    if(!account) return
    console.log("Sending command...");
    const signer = await getSigner(account)
    try{
      const _unsubscribe = await phala
            .command({
              account,
              contractId: CONTRACT_ID,
              payload: api
                .createType('DarkpoolCommand', {CancelOrder: null})
                .toHex(),
              signer,
              onStatus: (status) => {
                if(status.isFinalized){
                  console.log("Command sent");
                }
              }
            })
    }catch(err){
      console.log(err);
    }
  }, [phala, api, certificateData])
  
  const onGetOrder = useCallback(() => {
    if(!certificateData) return
    const encodedQuery = api
          .createType('DarkpoolRequest', {
            head: {
              id: numberToHex(CONTRACT_ID, 256),
              nonce: hexAddPrefix(randomHex(32))
            },
            data: {GetOrder: null}
          }).toHex()

    phala
      .query(encodedQuery, certificateData)
      .then((data) => {
        const {
          result: {ok, err}
        } = api
              .createType("DarkpoolResponse", hexAddPrefix(data))
              .toJSON() as any

        if(ok) {
          const res = ok
          console.log(JSON.stringify(res, null, 4))
        }

        if(err){
          throw new Error(err);
        }
      })
      .catch((err) => {
        console.log(err);
      })
  }, [phala, api, certificateData])

  const onGetTradeHistory = useCallback(() => {
    if(!certificateData) return
    const encodedQuery = api
          .createType('DarkpoolRequest', {
            head: {
              id: numberToHex(CONTRACT_ID, 256),
              nonce: hexAddPrefix(randomHex(32))
            },
            data: {GetTradeHistory: null}
          }).toHex()

    phala
      .query(encodedQuery, certificateData)
      .then((data) => {
        const {
          result: {ok, err}          
        } = api
              .createType("DarkpoolResponse", hexAddPrefix(data))
              .toJSON() as any

        if(ok) {
          const res = ok
          console.log(JSON.stringify(res, null, 4))
        }

        if(err){
          throw new Error(err);
        }
        
      })
      .catch((err) => {
        console.log(err);
      })
  }, [phala, api, certificateData])
  
  return (
      <ProgressSteps
    current={certificateData ? 1 : 0}
    overrides={{
      Root: {
        style: {width: '100%'}
      }
    }}
      >

      <Step title="Sign Certificate">
      <ParagraphMedium>Click to sign a certificate first.</ParagraphMedium>
      <Button
    isLoading={signCertificateLoading}
    onClick={onSignCertificate}
    disabled={!account}
      >
      Sign Certificate
    </Button>
      </Step>

      <Step title="Darkpool, DOT/wUSD market">
      <div>
      <form onSubmit={onSendOrder}>

      <FormControl label="Order Side (Buy=Buy DOTs for wUSD, Sell = Sell DOTs for wUSD)">
      <Select
    value={side}
    onChange={(e) => {
      setSide(e.value)
    }}
    options={[
      {id: 'Buy DOT/wUSD', side: true},
      {id: 'Sell DOT/wUSD', side: false}
    ]}
    labelKey="id"
    valueKey="side"
    overrides={{Root: {style: {width: '500px'}}}}
      />
      </FormControl>

      <FormControl label="Order Size">
      <Input
    type="number"
    value={size}
    min={0}
    onChange={(e) => {
      setSize(e.currentTarget.value)
    }}
    overrides={{Root: {style: {width: '500px'}}}}
      ></Input>
      </FormControl>

      <Button type="submit" disabled={!size}>
      Send Order
    </Button>
      
    </form>

      <ButtonGroup
    size="mini"
    overrides={{Root: {style: {marginTop: '16px'}}}}
      >

      <Button onClick={onGetOrder}>Get Order</Button>
      <Button onClick={onCancelOrder}>Cancel Order</Button>
      <Button onClick={onGetTradeHistory}>Get Trade History</Button>
    </ButtonGroup>
    
      </div>
      </Step>
      
    
    </ProgressSteps>

  )
}









const DarkpoolPage: Page = () => {

  const [api, setApi] = useState<ApiPromise>()
  const [phala, setPhala] = useState<PhalaInstance>()

  useEffect(() => {
    createApi({
      endpoint: process.env.NEXT_PUBLIC_WS_ENDPOINT as string,
      types: {
        Status: {
          _enum: ['Active', 'Inactive']
        },
        Side: {
          _enum: ['Buy', 'Sell']
        },
        Order: {acct: 'AccountId', status: 'Status', side: 'Side', size: 'u64', filled: 'u64'},
        Trade: {side: 'Side', size: 'u64', px: 'u64'},
        OrderDetails: { is_buy:'bool', size: 'u64' },
        OrderDetailsWithPx: { is_buy:'bool', size: 'u64', px_u64: 'u64'},
        DarkpoolError: {
          _enum: ['GenericError']
        },
        DarkpoolRequestData: {
          _enum: {GetOrder: null, GetTradeHistory: null}
        },
        DarkpoolResponseData: {
          _enum: {ActiveOrder: 'Order', TradeHistory: 'Vec<Trade>', None: null}
        },
        DarkpoolRequest: {
          head: 'ContractQueryHead',
          data: 'DarkpoolRequestData'
        },
        DarkpoolResponse: {
          nonce: '[u8; 32]',
          result: 'Result<DarkpoolResponseData, DarkpoolError>'
        },
        DarkpoolCommand: {
          _enum: {SendOrder: 'OrderDetails', SendOrderWithPx: 'OrderDetailsWithPx', CancelOrder: null}
        }
      }
    })
      .then((api) => {
        setApi(api)
        return createPhala({api, baseURL}).then((phala) => {
          setPhala(() => phala)
        })
      })
      .catch((err) => {
        console.log(err);
      })
  }, [])

  if(api && phala){
    return <Darkpool api={api} phala={phala} />
  }

  return (
      <Block
    display="flex"
    flexDirection="column"
    alignItems="center"
    height="280px"
    justifyContent="center"
      >
      <StyledSpinnerNext />
      <LabelXSmall marginTop="20px">Initializing</LabelXSmall>
      </Block>
  )  
}

DarkpoolPage.title = 'Darkpool'
export default DarkpoolPage