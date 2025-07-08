export const prepareRowData = (
  inputs: any[],

  data: any,
) => {
  // Prepare the row data for the skill call
  return inputs.reduce(
    (acc, input) => ({
      ...acc,
      [input.name]: data[input.name],
    }),
    {},
  );
};
