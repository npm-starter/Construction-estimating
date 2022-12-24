import React from 'react';
import { SpreadsheetComponent } from '@syncfusion/ej2-react-spreadsheet';


const Spreadsheet = () => {
        return  (
            <div className="m-2 md:m-10 mt-24 p-2 md:p-10 bg-white rounded-3xl">
        <SpreadsheetComponent className="w-full h-full"/>
        </div>
    );
};

export default Spreadsheet;