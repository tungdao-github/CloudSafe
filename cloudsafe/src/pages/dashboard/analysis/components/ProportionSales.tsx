import { Pie } from '@ant-design/plots';
import { Card, Segmented, Typography } from 'antd';
import React from 'react';
import { formatNumber } from '@/utils/format';
import type { DataItem } from '../data.d';
import useStyles from '../style.style';

const { Text } = Typography;
const ProportionSales = ({
  renderDropdownGroup,
  salesType,
  loading,
  salesPieData,
  handleChangeSalesType,
}: {
  loading: boolean;
  renderDropdownGroup: () => React.ReactNode;
  salesType: 'all' | 'online' | 'stores';
  salesPieData: DataItem[];
  handleChangeSalesType?: (value: 'all' | 'online' | 'stores') => void;
}) => {
  const { styles } = useStyles();
  const dropdownGroup = renderDropdownGroup();
  const extra = (
    <div className={styles.salesCardExtra}>
      {dropdownGroup}
      <Segmented
        className={styles.salesTypeRadio}
        value={salesType}
        onChange={handleChangeSalesType}
        options={[
          { label: 'Tất cả', value: 'all' },
          { label: 'Online', value: 'online' },
          { label: 'Cục bộ', value: 'stores' },
        ]}
        size="middle"
      />
    </div>
  );
  return (
    <Card
      loading={loading}
      className={styles.salesCard}
      variant="borderless"
      title="Phân loại file theo loại"
      style={{
        height: '100%',
      }}
      extra={extra}
    >
      <Text>销售额</Text>
      <Pie
        height={340}
        radius={0.8}
        innerRadius={0.5}
        angleField="y"
        colorField="x"
        data={salesPieData as any}
        legend={false}
        label={{
          position: 'spider',
          text: (item: { x: number; y: number }) =>
            `${item.x}: ${formatNumber(item.y)}`,
        }}
      />
    </Card>
  );
};
export default ProportionSales;
