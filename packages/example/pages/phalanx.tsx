import type { ApiPromise } from '@polkadot/api'
import { createApi } from 'lib/polkadotApi'
import { useCallback, useEffect, useRef, useState } from 'react'
import * as React from "react"
import { create, signCertificate, CertificateData } from '@phala/sdk'
import { Button } from 'baseui/button'
import { useAtom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'
import accountAtom from 'atoms/account'
import { getSigner } from 'lib/polkadotExtension'
import { ButtonGroup } from 'baseui/button-group'
import { FormControl } from 'baseui/form-control'
import { Input } from 'baseui/input'
import { ContractPromise } from '@polkadot/api-contract'
import contractMetadata from 'lib/metadata.json'
import { Textarea } from 'baseui/textarea'
import { toaster } from 'baseui/toast'
import { LabelXSmall, ParagraphMedium } from 'baseui/typography'
import { ProgressSteps, NumberedStep } from 'baseui/progress-steps'


const baseURL = '/'

const contractIdAtom = atomWithStorage<string>(
  'contractId',
  '0xb431ed6888a4aca29768ec39924fa8d8236897f5191a122098fc9a36e8e3f91e'
)

const metadataStringAtom = atomWithStorage<string>(
  'metadataString',
  JSON.stringify(contractMetadata, null, 2)
)

const Phalanx: Page = () => {
  const [account] = useAtom(accountAtom)
  const [contractId, setContractId] = useAtom(contractIdAtom)
  const [metadataString, setMetadataString] = useAtom(metadataStringAtom)
  const [certificateData, setCertificateData] = useState<CertificateData>()
  const [signCertificateLoading, setSignCertificateLoading] = useState(false)
  const [api, setApi] = useState<ApiPromise>()
  const [contract, setContract] = useState<ContractPromise>()
  const unsubscribe = useRef<() => void>()

  const [current, setCurrent] = React.useState(0)
  const [side, setSide] = useState(true)
  const [size, setSize] = useState('')

  const loadContract = async () => {
    try {
      const api = await createApi({
        endpoint: process.env.NEXT_PUBLIC_WS_ENDPOINT,
      })
      setApi(api)
      const flipContract = new ContractPromise(
        await create({ api, baseURL, contractId }),
        JSON.parse(metadataString),
        contractId
      )
      setContract(flipContract)
      setCurrent(1)
      toaster.positive('Contract created', {})
    } catch (err) {
      toaster.negative((err as Error).message, {})
    }
  }

  // See https://reactjs.org/docs/hooks-effect.html
  // useEffect purpose here is to connect to the account API
  useEffect(() => {
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
    if (account && api) {
      try {
        const signer = await getSigner(account)

        // Save certificate data to state, or anywhere else you want like local storage
        setCertificateData(
          await signCertificate({
            api,
            account,
            signer,
          })
        )
        setCurrent(3)
        toaster.positive('Certificate signed', {})
      } catch (err) {
        toaster.negative((err as Error).message, {})
      }
    }
  }, [api, account])

  const onQuery = () => {
    if (!certificateData || !contract) return
    contract.query.get(certificateData as any as string, {}).then((res) => {
      toaster.info(JSON.stringify(res.output?.toHuman()), {})
    })
  }

  const onCommand = async () => {
    if (!contract || !account) return
    const signer = await getSigner(account)
    contract.tx.flip({}).signAndSend(account.address, { signer }, (status) => {
      if (status.isInBlock) {
        toaster.positive('In Block', {})
      }
    })
  }

  const resetApplication = async () => {
     setCurrent(0)
  }

  return (
    <div>
      <ButtonGroup>
        <Button onClick={resetApplication}>
          Reset
        </Button>
        <Button disabled={!contract} onClick={onCommand}>
          Flip
        </Button>
      </ButtonGroup>


      <ProgressSteps
        current={current}
        overrides={{
          Root: {
            style: { width: '100%' }
          }
        }}
      >
        <NumberedStep title="Set contract ID">
          <ParagraphMedium>Fill Contract ID and ABI Metadata.</ParagraphMedium>
          <FormControl label="Contract Id">
            <Input
              overrides={{
                Input: {
                  style: {
                    fontFamily: 'monospace',
                  },
                },
              }}
              autoFocus
              value={contractId}
              onChange={(e) => setContractId(e.currentTarget.value)}
            ></Input>
          </FormControl>
          <FormControl label="ABI">
            <Textarea
              overrides={{
                Input: {
                  style: {
                    fontFamily: 'monospace',
                    height: '200px',
                  },
                },
              }}
              value={metadataString}
              onChange={(e) => setMetadataString(e.currentTarget.value)}
            ></Textarea>
          </FormControl>
          <Button onClick={loadContract}>
            Load Contract
          </Button>
        </NumberedStep>

        <NumberedStep title="Sign Certificate">
          <ParagraphMedium>Click to sign a certificate first.</ParagraphMedium>
          <Button
            isLoading={signCertificateLoading}
            onClick={onSignCertificate}
            disabled={!account}
          >
            Sign Certificate
          </Button>
          </NumberedStep>
          <NumberedStep title="Start Phalanx App">
        </NumberedStep>

      </ProgressSteps>
    </div>
  )
}

Phalanx.title = 'Phalanx'

export default Phalanx
