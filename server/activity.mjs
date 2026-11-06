const pair=(en,ar)=>({en,ar});
// Public descriptions of actual operations; no model reasoning or unsupported connection claims.
export function activityLabel(id,query,profile={},motor={}){
 const budget=/budget|afford|cheaper|premium|ميزاني|أرخص|قسط/i.test(query),income=/income|salary|earn|دخل|راتب/i.test(query),comparison=/compar|trade.off|lose|قارن|مقارن|أفقد/i.test(query),market=/trend|market|benchmark|سوق|اتجاه/i.test(query),vehicle=profile.category==='motor'||/motor|SUV|car|vehicle|مركب|سيار/i.test(query);
 if(id==='understanding')return budget?pair('Understanding your budget preferences','فهم تفضيلات ميزانيتك'):comparison?pair('Understanding what you want to compare','فهم ما تود مقارنته'):income?pair('Understanding the income details you shared','فهم تفاصيل الدخل التي شاركتها'):vehicle?pair('Understanding your vehicle protection needs','فهم احتياجات حماية مركبتك'):market?pair('Understanding your question about market trends','فهم سؤالك عن اتجاهات السوق'):pair('Understanding what you need help with','فهم ما تحتاج المساعدة فيه');
 if(id==='reviewing')return vehicle?pair('Reviewing relevant ART motor cover','مراجعة تغطية المركبات المناسبة من تكافل الراجحي'):pair('Reviewing information relevant to your question','مراجعة المعلومات المتعلقة بسؤالك');
 if(id==='analysing')return income?pair('Updating your income and protection context','تحديث تفاصيل الدخل واحتياجات الحماية'):pair('Updating the details and preferences you shared','تحديث التفاصيل والتفضيلات التي شاركتها');
 if(id==='calculating')return income?pair('Estimating income-replacement needs','تقدير احتياجات تعويض الدخل'):pair('Calculating the requested protection scenario','حساب سيناريو الحماية المطلوب');
 if(id==='comparing')return budget?pair('Comparing cover against your revised priorities','مقارنة التغطية وفق أولوياتك المحدثة'):pair('Comparing coverage and trade-offs','مقارنة التغطية والمفاضلات');
 if(id==='matching')return pair('Checking which protection approaches fit','التحقق من ملاءمة خيارات الحماية');
 if(id==='market')return pair('Checking available dated market evidence','مراجعة أدلة السوق المؤرخة المتاحة');
 if(id==='insights')return pair('Checking available supporting insights','مراجعة المعلومات الداعمة المتاحة');
 return pair('Preparing guidance for your question','إعداد إرشادات لسؤالك');
}
