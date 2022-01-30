module.exports = {
  nodes: [
    {data: {id: '2020::A', rLEDState: false, gLEDState: false}},
    {data: {id: '2020::C', rLEDState: false, gLEDState: false}},
    {data: {id: '2020::B', rLEDState: false, gLEDState: false}},
    {data: {id: '2020::D', rLEDState: false, gLEDState: false}},
    {data: {id: '2020::E', rLEDState: false, gLEDState: false}},
    {data: {id: '2020::F', rLEDState: false, gLEDState: false}},
    {
      data: {
        id: '2020:0000:0000:0000:0000:0000:0000:0000',
        rLEDState: false,
        gLEDState: false,
      },
    },
  ],
  edges: [
    {
      data: {
        source: '2020::A',
        target: '2020::C',
        id: '2020::A->2020::C',
      },
    },
    {
      data: {
        source: '2020::A',
        target: '2020::B',
        id: '2020::A->2020::B',
      },
    },
    {
      data: {
        source: '2020::B',
        target: '2020::D',
        id: '2020::B->2020::D',
      },
    },
    {
      data: {
        source: '2020::B',
        target: '2020::E',
        id: '2020::B->2020::E',
      },
    },
    {
      data: {
        source: '2020::E',
        target: '2020::F',
        id: '2020::E->2020::F',
      },
    },
    {
      data: {
        source: '2020::E',
        target: '2020:0000:0000:0000:0000:0000:0000:0000',
        id: '2020::E->2020:0000:0000:0000:0000:0000:0000:0000',
      },
    },
  ],
};
