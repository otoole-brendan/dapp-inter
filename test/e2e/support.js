import '@agoric/synpress/support/index';
import { networks, COMMAND_TIMEOUT } from './test.utils';

const AGORIC_NET = Cypress.env('AGORIC_NET') || 'local';
const keyRing = AGORIC_NET === networks.LOCAL ? '--keyring-backend=test' : '';
const agops = '/usr/src/agoric-sdk/packages/agoric-cli/bin/agops';

Cypress.Commands.add('addKeys', params => {
  const { keyName, mnemonic, expectedAddress } = params;
  const command = `echo ${mnemonic} | agd keys add ${keyName} --recover ${keyRing}`;

  cy.exec(command).then(({ stdout }) => {
    expect(stdout).to.contain(expectedAddress);
  });
});

Cypress.Commands.add('setOraclePrice', price => {
  cy.exec(
    `${agops} oracle setPrice --keys gov1,gov2 --pair ATOM.USD --price ${price} ${keyRing}`,
    {
      env: { AGORIC_NET },
      timeout: COMMAND_TIMEOUT,
    },
  ).then(({ stdout }) => {
    expect(stdout).to.not.contain('Error');
    expect(stdout).to.not.contain('error');
  });
});

Cypress.Commands.add('createVault', params => {
  const { wantMinted, giveCollateral, userKey } = params;

  const createVaultCommand = `${agops} vaults open --wantMinted "${wantMinted}" --giveCollateral "${giveCollateral}" > /tmp/want-ist.json`;

  cy.exec(createVaultCommand, {
    env: { AGORIC_NET },
    timeout: COMMAND_TIMEOUT,
  }).then(({ stdout }) => {
    expect(stdout).not.to.contain('Error');

    const broadcastCommand = `${agops} perf satisfaction --executeOffer /tmp/want-ist.json --from "${userKey}" ${keyRing}`;

    cy.exec(broadcastCommand, {
      env: { AGORIC_NET },
      timeout: COMMAND_TIMEOUT,
    }).then(({ stdout }) => {
      expect(stdout).not.to.contain('Error');
    });
  });
});

Cypress.Commands.add('placeBidByPrice', params => {
  const { fromAddress, giveAmount, price } = params;
  const command = `${agops} inter bid by-price --from ${fromAddress} --give ${giveAmount} --price ${price} ${keyRing}`;

  cy.exec(command, {
    env: { AGORIC_NET },
    timeout: COMMAND_TIMEOUT,
    failOnNonZeroExit: false,
  }).then(({ stdout }) => {
    expect(stdout).to.contain('Your bid has been accepted');
  });
});

Cypress.Commands.add('placeBidByDiscount', params => {
  const { fromAddress, giveAmount, discount } = params;

  const command = `${agops} inter bid by-discount --from ${fromAddress} --give ${giveAmount} --discount ${discount} ${keyRing}`;

  cy.exec(command, {
    env: { AGORIC_NET },
    timeout: COMMAND_TIMEOUT,
    failOnNonZeroExit: false,
  }).then(({ stdout }) => {
    expect(stdout).to.contain('Your bid has been accepted');
  });
});

Cypress.Commands.add('verifyAuctionData', (propertyName, expectedValue) => {
  return cy
    .exec(`${agops} inter auction status`, {
      env: { AGORIC_NET },
      failOnNonZeroExit: false,
      timeout: COMMAND_TIMEOUT,
    })
    .then(({ stdout }) => {
      const output = JSON.parse(stdout);
      const propertyValue = Cypress._.get(output, propertyName);

      if (!propertyValue) {
        throw new Error(`Error: ${propertyName} property is missing or empty`);
      }

      expect(propertyValue).to.equal(expectedValue);
    });
});

Cypress.Commands.add('skipWhen', function (expression) {
  if (expression) {
    this.skip();
  }
});

const connectWalletLocalChain = () => {
  cy.contains('Connect Wallet').click();

  cy.contains(
    'By clicking here you are indicating that you have read and agree to our',
  )
    .closest('label')
    .find('input[type="checkbox"]')
    .click();
  cy.contains('Proceed').click();

  cy.acceptAccess().then(taskCompleted => {
    expect(taskCompleted).to.be.true;
  });

  cy.acceptAccess().then(taskCompleted => {
    expect(taskCompleted).to.be.true;
  });
};

const connectWalletEmerynet = () => {
  cy.contains('button', 'Dismiss').click();
  cy.get('button').contains('Local Network').click();
  cy.get('button').contains('Agoric Emerynet').click();
  cy.get('button').contains('Keep using Old Version').click();

  cy.contains('Connect Wallet').click();

  cy.acceptAccess().then(taskCompleted => {
    expect(taskCompleted).to.be.true;
  });

  cy.get('label input[type="checkbox"]').check();
  cy.contains('Proceed').click();

  cy.acceptAccess().then(taskCompleted => {
    expect(taskCompleted).to.be.true;
  });
};

Cypress.Commands.add('connectWithWallet', () => {
  cy.visit('/');
  if (AGORIC_NET === networks.LOCAL) {
    connectWalletLocalChain();
  } else {
    connectWalletEmerynet();
  }
});
