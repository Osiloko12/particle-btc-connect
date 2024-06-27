export const accountContracts = {
  BTC: [
    {
      chainIds: [
        4200, 686868, 223, 1123, 200901, 200810, 11501, 11503, 1501, 1502, 3109, 3110, 22776, 212, 60808, 111, 8329,
        83291, 1116, 1115, 3636, 89682, 1, 11155111, 137, 80002, 2442, 56, 97, 42161, 421614, 5000, 5003,
      ],
      version: '1.0.0',
    },
    // {
    //   chainIds: [137],
    //   version: '1.1.0',
    // },
    {
      chainIds: [
        4200, 686868, 223, 1123, 200901, 200810, 11501, 11503, 1501, 1502, 3109, 3110, 22776, 212, 60808, 111, 8329,
        83291, 1116, 1115, 3636, 89682, 1, 11155111, 137, 80002, 2442, 56, 97, 42161, 421614, 5000, 5003,
      ],
      version: '2.0.0',
    },
  ],
  // UNIVERSAL: [
  //   {
  //     chainIds: [11155111, 137],
  //     version: '1.0.0',
  //   },
  // ],
};

export type ContractName = keyof typeof accountContracts;
