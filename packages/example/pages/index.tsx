import type {NextPage} from 'next'
import Head from 'next/head'
import Link from 'next/link'
import {StyledLink} from 'baseui/link'

const LINKS: [string, string][] = [
  ['/pink-flip', 'Flip'],
  ['/pink-flip-test', 'FlipTest'],
  ['/phalanx', 'Phalanx']
]

const Home: NextPage = () => {
  return (
    <div>
      <Head>
        <title>Phalanx SDK Example</title>
      </Head>

      <ol>
        {LINKS.map(([href, label], index) => (
          <li key={href}>
            <Link href={href} passHref>
              <StyledLink>{label}</StyledLink>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  )
}

export default Home
